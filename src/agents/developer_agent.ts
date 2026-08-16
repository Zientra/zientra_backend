import { mono_room } from "../dtypes/Mono_room";
import { sendAgentMessage } from "./agent_messaging";
import { createCodeBufferTools } from "./tools/code_tools";
import { createRunCodeTool } from "./tools/run_code_tools";
import { AgentTool } from "./types";
import {
    callGroq,
    GroqMessage,
    GroqToolDefinition
} from "./groq_client";

const AGENT_USER_ID = "developer_agent";
const AGENT_USERNAME = "developer_agent";
const AGENT_DISPLAY_NAME = "Developer Agent";

const MAX_ITERATIONS = 10;

function extractTask(messageContent: string): string {
    return messageContent
        .replace("@developer_agent", "")
        .trim();
}

function toGroqToolDefinitions(
    tools: AgentTool[]
): GroqToolDefinition[] {
    return tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}

const SYSTEM_PROMPT = `You are the Developer Agent inside Zientra, a collaborative coding workspace.
A teammate has asked you to build or extend functionality in the code
currently open in the shared editor.

There is no project on disk — the only code that exists is whatever is in the
shared editor buffer right now. You MUST:
1. Call read_current_code first to see what already exists and which
   language is active.
2. Implement what was asked, keeping any existing code that isn't related
   to the request.
3. Call write_fixed_code with the ENTIRE new file contents to apply your
   changes.
4. Call run_current_code to confirm the code actually runs without errors,
   if the language supports execution. If it isn't supported, say so and
   reason about correctness from the code instead.
5. Finish with a short, plain-language summary of what you built.

Never claim code was written unless you actually called write_fixed_code.
Never claim it runs unless you actually called run_current_code and saw it
succeed (when execution is supported).`;

// ============================================================
// MAIN ENTRY POINT
// ============================================================
//
// Called from index.ts's "send_message" handler when a message
// contains "@developer_agent". No separate WebSocket route.
//
export async function handleDeveloperAgentTrigger(
    room: mono_room,
    messageContent: string
): Promise<void> {

    const task = extractTask(messageContent);

    if (!task) {
        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            "Tell me what to build, e.g. `@developer_agent add a function that reverses a string`."
        );
        return;
    }

    if (!process.env.GROQ_API_KEY) {
        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            "Developer Agent is not configured: GROQ_API_KEY is missing on the server."
        );
        return;
    }

    sendAgentMessage(
        room,
        AGENT_USER_ID,
        AGENT_USERNAME,
        AGENT_DISPLAY_NAME,
        `Developer Agent starting: "${task}"`
    );

    const tools: AgentTool[] = [
        ...createCodeBufferTools(room),
        createRunCodeTool(room)
    ];

    const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
    const toolDefinitions = toGroqToolDefinitions(tools);
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const messages: GroqMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: task }
    ];

    let didWrite = false;
    let finalOutput = "Reached the step limit before finishing.";

    try {
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {

            const reply = await callGroq(messages, toolDefinitions, model);
            messages.push(reply);

            if (!reply.tool_calls || reply.tool_calls.length === 0) {
                finalOutput = reply.content ?? "Done.";
                break;
            }

            for (const toolCall of reply.tool_calls) {
                const tool = toolMap.get(toolCall.function.name);
                let resultText: string;

                if (!tool) {
                    resultText = `Unknown tool: ${toolCall.function.name}`;
                }
                else {
                    if (toolCall.function.name === "write_fixed_code") {
                        didWrite = true;
                    }

                    try {
                        const args = JSON.parse(toolCall.function.arguments || "{}");
                        resultText = await tool.execute(args);
                    }
                    catch (toolError) {
                        resultText = `Tool "${tool.name}" failed: ${toolError instanceof Error ? toolError.message : String(toolError)
                            }`;
                    }
                }

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: resultText
                });
            }
        }

        const statusLine = didWrite
            ? "Editor updated with the new code."
            : "No changes were made to the editor.";

        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            `${finalOutput}\n\n${statusLine}`
        );
    }
    catch (error) {
        console.error("[DeveloperAgent] Execution error:", error);

        room.broadcast({
            type: "agent.error",
            agentId: "developer_agent",
            roomId: room.id,
            content: "Developer Agent failed to complete the task."
        });
    }
}