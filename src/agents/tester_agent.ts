import { mono_room } from "../dtypes/Mono_room";
import { sendAgentMessage } from "./agent_messaging";
import { createCodeBufferTools } from "./tools/code_tools";
import { createTestRunnerTool } from "./tools/test_tools";
import { AgentTool } from "./types";
import {
    callGroq,
    GroqMessage,
    GroqToolDefinition
} from "./groq_client";

const AGENT_USER_ID = "tester_agent";
const AGENT_USERNAME = "tester_agent";
const AGENT_DISPLAY_NAME = "Tester Agent";

const MAX_ITERATIONS = 10;

function extractTask(messageContent: string): string {
    return messageContent
        .replace("@tester_agent", "")
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

const SYSTEM_PROMPT = `You are the Tester Agent inside Zientra, a collaborative coding workspace.
A teammate has asked you to test the code currently open in the shared editor.

There is no project on disk — the only code that exists is whatever is in the
shared editor buffer right now. You do NOT modify the editor. You MUST:
1. Call read_current_code first to see the actual code and its language.
2. Write a reasonable set of test cases covering the function(s) present:
   normal cases, at least one edge case, and error/invalid-input handling
   where applicable. Tests must print their own clear pass/fail output.
3. Call run_tests_against_code with that test code to actually execute it.
4. Report the ACTUAL pass/fail results from the tool output. Never claim a
   test passed that you did not actually run.
5. If a failure suggests a real bug in the code, describe it clearly and
   suggest the teammate run @debug_agent to fix it. Do not attempt to fix
   the code yourself.

You have no write_fixed_code tool available and must not attempt to modify
the shared editor in any way.`;

// ============================================================
// MAIN ENTRY POINT
// ============================================================
//
// Called from index.ts's "send_message" handler when a message
// contains "@tester_agent". No separate WebSocket route.
//
export async function handleTesterAgentTrigger(
    room: mono_room,
    messageContent: string
): Promise<void> {

    const task = extractTask(messageContent);
    const effectiveTask = task || "Test the current code thoroughly.";

    if (!process.env.GROQ_API_KEY) {
        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            "Tester Agent is not configured: GROQ_API_KEY is missing on the server."
        );
        return;
    }

    sendAgentMessage(
        room,
        AGENT_USER_ID,
        AGENT_USERNAME,
        AGENT_DISPLAY_NAME,
        `Tester Agent starting: "${effectiveTask}"`
    );

    // Reuse read_current_code from code_tools.ts, but deliberately leave
    // write_fixed_code out — the Tester Agent must never be able to modify
    // the shared editor buffer.
    const [readCodeTool] = createCodeBufferTools(room);

    const tools: AgentTool[] = [
        readCodeTool,
        createTestRunnerTool(room)
    ];

    const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
    const toolDefinitions = toGroqToolDefinitions(tools);
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const messages: GroqMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: effectiveTask }
    ];

    let didRunTests = false;
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
                    if (toolCall.function.name === "run_tests_against_code") {
                        didRunTests = true;
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

        const statusLine = didRunTests
            ? "Tests were actually executed against the current code."
            : "No tests were executed.";

        sendAgentMessage(
            room,
            AGENT_USER_ID,
            AGENT_USERNAME,
            AGENT_DISPLAY_NAME,
            `${finalOutput}\n\n${statusLine}`
        );
    }
    catch (error) {
        console.error("[TesterAgent] Execution error:", error);

        room.broadcast({
            type: "agent.error",
            agentId: "tester_agent",
            roomId: room.id,
            content: "Tester Agent failed to complete the task."
        });
    }
}