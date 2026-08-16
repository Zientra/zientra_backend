// // Debug Agent – the LangChain/LangGraph ReAct agent wired into Zientra's room system.
// //
// // Integration flow:
// //   send_message handler in index.ts
// //       ↓ calls handleDebugAgentTrigger()
// //       ↓ checks @debug_agent mention
// //       ↓ starts agent if not already running in the room
// //       ↓ streams Zientra-level AgentEvents back via room.broadcast()
// //
// // AI PROVIDER:
// //   Controlled by AI_PROVIDER env var.
// //   AI_PROVIDER=groq    → uses @langchain/groq   (requires GROQ_API_KEY)
// //   AI_PROVIDER=openai  → uses @langchain/openai (requires OPENAI_API_KEY)
// //   Default: groq

// // ─── GROQ IMPLEMENTATION - CURRENTLY ACTIVE ───────────────────────────────────
// import { ChatGroq } from "@langchain/groq";
// // ──────────────────────────────────────────────────────────────────────────────

// // ─── OPENAI IMPLEMENTATION - PRESERVED FOR EASY SWITCHING ─────────────────────
// import { ChatOpenAI } from "@langchain/openai";
// // ──────────────────────────────────────────────────────────────────────────────

// import { createReactAgent } from "@langchain/langgraph/prebuilt";
// import { HumanMessage } from "@langchain/core/messages";
// import { mono_room } from "../dtypes/Mono_room";
// import {
//     agentError,
//     agentFinished,
//     agentMessage,
//     agentStarted,
//     agentStatus,
//     agentToolFinished,
//     agentToolStarted,
// } from "./types";
// import { createDebugTools, getWorkspaceRoot } from "./debug_tools";

// // ─── Concurrency guard ────────────────────────────────────────────────────────
// // Tracks which rooms currently have an active Debug Agent task.
// const activeRooms = new Set<string>();

// // ─── LLM factory (provider switch) ───────────────────────────────────────────

// /**
//  * Returns the appropriate LangChain chat model based on AI_PROVIDER env var.
//  *
//  * Switch providers easily in .env:
//  *   AI_PROVIDER=groq   (requires GROQ_API_KEY)
//  *   AI_PROVIDER=openai (requires OPENAI_API_KEY)
//  */
// function buildLLM() {
//     const provider = (process.env.AI_PROVIDER ?? "groq").toLowerCase();

//     if (provider === "openai") {
//         // ── OPENAI IMPLEMENTATION ─────────────────────────────────────────────
//         if (!process.env.OPENAI_API_KEY) {
//             throw new Error("OPENAI_API_KEY is not set. Add it to your .env file.");
//         }
//         return new ChatOpenAI({
//             model: "gpt-4o-mini",
//             temperature: 0,
//             apiKey: process.env.OPENAI_API_KEY,
//         });
//         // ─────────────────────────────────────────────────────────────────────
//     }

//     // ── GROQ IMPLEMENTATION (default) ─────────────────────────────────────────
//     if (!process.env.GROQ_API_KEY) {
//         throw new Error("GROQ_API_KEY is not set. Add it to your .env file.");
//     }

//     return new ChatGroq({
//         model: "llama-3.3-70b-versatile",
//         temperature: 0,
//         apiKey: process.env.GROQ_API_KEY,
//     });
//     // ─────────────────────────────────────────────────────────────────────────
// }

// // ─── Agent trigger ────────────────────────────────────────────────────────────

// /**
//  * Call this from the send_message handler in index.ts.
//  *
//  * @param room    The mono_room the message arrived in.
//  * @param content The raw message content (may or may not contain @debug_agent).
//  */
// export async function handleDebugAgentTrigger(
//     room: mono_room,
//     content: string
// ): Promise<void> {

//     // ── 1. Check for @debug_agent mention ────────────────────────────────────
//     if (!content.includes("@debug_agent")) {
//         return; // Not meant for the agent – ignore completely.
//     }

//     // ── 2. Extract the task (strip the mention) ───────────────────────────────
//     const task = content
//         .replace(/@debug_agent/g, "")
//         .trim();

//     // ── 3. Handle empty task ──────────────────────────────────────────────────
//     if (!task) {
//         room.broadcast(
//             agentMessage(
//                 room.id,
//                 "I am the Debug Agent. I can inspect and fix bugs in the project. " +
//                 "Please provide a bug description or task (e.g. @debug_agent fix the login validation bug)."
//             )
//         );
//         return;
//     }

//     // ── 4. Concurrency guard ──────────────────────────────────────────────────
//     if (activeRooms.has(room.id)) {
//         room.broadcast(
//             agentMessage(
//                 room.id,
//                 "Debug Agent is currently working on another task in this room. " +
//                 "Please wait until it finishes before submitting a new task."
//             )
//         );
//         return;
//     }

//     // ── 5. Mark room as busy and start task asynchronously ───────────────────
//     activeRooms.add(room.id);

//     // Run without awaiting so we return control to the WS handler immediately.
//     runDebugAgent(room, task).finally(() => {
//         activeRooms.delete(room.id);
//     });
// }

// // ─── Core agent runner ────────────────────────────────────────────────────────

// async function runDebugAgent(room: mono_room, task: string): Promise<void> {

//     const workspace = getWorkspaceRoot();

//     // ── 6. Announce start ─────────────────────────────────────────────────────
//     room.broadcast(agentStarted(room.id));
//     room.broadcast(agentMessage(room.id, `I'll work on: "${task}"`));
//     room.broadcast(agentStatus(room.id, "initializing"));

//     try {

//         // ── 7. Build the LLM (provider determined by AI_PROVIDER env var) ────
//         const llm = buildLLM();

//         // ── 8. Create the tools ───────────────────────────────────────────────
//         const tools = createDebugTools(workspace);

//         // ── 9. System prompt ─────────────────────────────────────────────────
//         const systemPrompt =
//             `You are the Debug Agent for the Zientra project. ` +
//             `Your ONLY responsibility is to find and fix bugs in the local codebase located at: ${workspace}. ` +
//             `You are NOT a general-purpose assistant. If the user asks something unrelated to bug-fixing or coding, ` +
//             `politely decline and remind them of your purpose. ` +
//             `Always inspect the code first, understand the problem, then apply the minimal necessary fix. ` +
//             `Run tests or builds after fixing to verify the change. ` +
//             `NEVER access paths outside: ${workspace}. ` +
//             `NEVER read or print environment variables or API keys.`;

//         // ── 10. Assemble the LangGraph ReAct agent ────────────────────────────
//         const agent = createReactAgent({
//             llm,
//             tools,
//             prompt: systemPrompt,
//         });

//         // ── 11. Stream and broadcast intermediate steps ───────────────────────
//         room.broadcast(agentStatus(room.id, "analyzing"));

//         let finalOutput = "";

//         const stream = agent.streamEvents(
//             {
//                 messages: [new HumanMessage(task)],
//             },
//             { version: "v2" }
//         );

//         for await (const event of stream) {
//             const kind = event.event;
//             const name = (event.name as string) ?? "";
//             const data = event.data as Record<string, unknown> ?? {};

//             if (kind === "on_tool_start") {
//                 const toolName = name || "tool";
//                 room.broadcast(agentToolStarted(room.id, toolName));
//                 room.broadcast(agentMessage(room.id, `Using tool: ${toolName}…`));
//                 room.broadcast(agentStatus(room.id, "working"));
//             }

//             if (kind === "on_tool_end") {
//                 const toolName = name || "tool";
//                 const output = data.output;
//                 const preview =
//                     typeof output === "string"
//                         ? output.slice(0, 300)
//                         : JSON.stringify(output ?? "").slice(0, 300);
//                 room.broadcast(agentToolFinished(room.id, toolName, preview));
//                 room.broadcast(agentStatus(room.id, "analyzing"));
//             }

//             if (kind === "on_chat_model_stream") {
//                 const chunk = data.chunk as Record<string, unknown> | undefined;
//                 if (!chunk) continue;
//                 const content = chunk.content;
//                 if (typeof content === "string" && content.trim()) {
//                     // streaming token — accumulate silently
//                     finalOutput += content;
//                 }
//             }

//             if (kind === "on_chat_model_end") {
//                 const output = data.output as Record<string, unknown> | undefined;
//                 if (!output) continue;

//                 const content = output.content;
//                 const toolCalls = output.tool_calls as Array<{ name: string }> | undefined;

//                 if (toolCalls && toolCalls.length > 0) {
//                     finalOutput = "";
//                 } else if (typeof content === "string" && content.trim()) {
//                     room.broadcast(agentMessage(room.id, content));
//                     finalOutput = content;
//                 } else if (Array.isArray(content)) {
//                     for (const part of content) {
//                         if (
//                             typeof part === "object" &&
//                             part !== null &&
//                             (part as Record<string, unknown>).type === "text"
//                         ) {
//                             const text = (part as Record<string, unknown>).text as string;
//                             if (typeof text === "string" && text.trim()) {
//                                 room.broadcast(agentMessage(room.id, text));
//                                 finalOutput = text;
//                             }
//                         }
//                     }
//                 }
//             }
//         }

//         // ── 12. Broadcast completion ───────────────────────────────────────────
//         room.broadcast(
//             agentFinished(
//                 room.id,
//                 finalOutput || "Task completed successfully."
//             )
//         );

//     } catch (err: any) {

//         // ── 13. Error handling – never crash the WS server ────────────────────
//         const message =
//             err?.message || (typeof err === "string" ? err : JSON.stringify(err));

//         console.error("[DebugAgent] Error:", message);

//         room.broadcast(
//             agentError(
//                 room.id,
//                 `I couldn't complete the task. Reason: ${message}`
//             )
//         );
//     }
// }









import { mono_room } from "../dtypes/Mono_room";
import { Message } from "../dtypes/message";
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

// ============================================================
// SEND A CHAT MESSAGE FROM THE AGENT
// ============================================================

// Reuses the exact same mechanism the human chat path already
// uses in index.ts: `Message` + `room.add_message` + `room.broadcast`.
// No new WebSocket method is introduced.

function sendAgentMessage(
    room: mono_room,
    content: string
) {
    const msg = new Message(
        room.id,
        AGENT_USER_ID,
        AGENT_USERNAME,
        AGENT_DISPLAY_NAME,
        content
    );

    room.add_message(msg);

    room.broadcast({
        type: "message",
        content: msg
    });
}

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
// This is a hand-rolled tool-calling loop against Groq's
// OpenAI-compatible /chat/completions endpoint — no agent
// framework involved:
//
//   1. Send the conversation + tool definitions to Groq.
//   2. If the model asks to call tools, run them locally and
//      append their results as "tool" messages.
//   3. Repeat until the model replies with plain content instead
//      of a tool call, or MAX_ITERATIONS is hit.
//
export async function handleDebugAgentTrigger(
    room: mono_room,
    messageContent: string
): Promise<void> {

    const task = extractTask(messageContent);

    if (!task) {
        sendAgentMessage(
            room,
            "Tell me what to fix, e.g. `@debug_agent fix the off-by-one error in the loop`."
        );
        return;
    }

    if (!process.env.GROQ_API_KEY) {
        sendAgentMessage(
            room,
            "Debug Agent is not configured: GROQ_API_KEY is missing on the server."
        );
        return;
    }

    sendAgentMessage(room, `Debug Agent starting: "${task}"`);

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

            // ------------------------------------------------
            // No tool calls -> the model is done, this is the
            // final answer.
            // ------------------------------------------------
            if (!reply.tool_calls || reply.tool_calls.length === 0) {
                finalOutput = reply.content ?? "Done.";
                break;
            }

            // ------------------------------------------------
            // Run every requested tool call and feed the result
            // back in as a "tool" message, keyed by tool_call_id
            // so the model can match them up.
            // ------------------------------------------------
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