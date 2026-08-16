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

const AGENT_USER_ID = "debug_agent";
const AGENT_USERNAME = "debug_agent";
const AGENT_DISPLAY_NAME = "Debug Agent";

const MAX_ITERATIONS = 10;

function extractTask(messageContent: string): string {
    return messageContent
        .replace("@debug_agent", "")
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

const SYSTEM_PROMPT = `You are the Debug Agent inside Zientra, a collaborative coding workspace.
A teammate has asked you to fix a bug in the code currently open in the shared editor.

There is no project on disk — the only code that exists is whatever is in the
shared editor buffer right now. You MUST:
1. Call read_current_code first to see the actual code and its language.
2. Identify the actual bug, not just a guess.
3. Call write_fixed_code with the ENTIRE corrected file to apply the fix.
4. Call run_current_code to verify the fix actually runs correctly, if the
   language supports execution. If it isn't supported, say so and reason
   about correctness from the code instead.
5. Finish with a short, plain-language summary of what was wrong and what
   you changed.

Never claim a fix was made unless you actually called write_fixed_code.
Never claim it runs correctly unless you actually called run_current_code
and saw it succeed (when execution is supported).`;

// ============================================================
// MAIN ENTRY POINT
// ============================================================
//
// Called from index.ts's "send_message" handler when a message
// contains "@debug_agent". No separate WebSocket route.
//
export async function handleDebugAgentTrigger(
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
            "Tell me what to fix, e.g. `@debug_agent fix the off-by-one error in the loop`."
        );
        return;
    }

    if (!process.env.GROQ_API_KEY) {
        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            "Debug Agent is not configured: GROQ_API_KEY is missing on the server."
        );
        return;
    }

    sendAgentMessage(
        room,
        AGENT_USER_ID,
        AGENT_USERNAME,
        AGENT_DISPLAY_NAME,
        `Debug Agent starting: "${task}"`
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
            ? "Editor updated with the fix."
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
        console.error("[DebugAgent] Execution error:", error);

        room.broadcast({
            type: "agent.error",
            agentId: "debug_agent",
            roomId: room.id,
            content: "Debug Agent failed to complete the task."
        });
    }
}