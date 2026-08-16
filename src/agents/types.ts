// // Zientra-level agent event types.
// // These are the ONLY event shapes the agent is allowed to broadcast to a room.
// // LangChain / LangGraph internals must NEVER be exposed directly.

// export type AgentEventType =
//     | "agent.started"
//     | "agent.status"
//     | "agent.message"
//     | "agent.tool_started"
//     | "agent.tool_finished"
//     | "agent.finished"
//     | "agent.error";

// export interface AgentEvent {
//     type: AgentEventType;
//     agentId: string;
//     roomId: string;
//     content?: string;
//     status?: string;
//     tool?: string;
// }

// // Convenience constructors ------------------------------------------------

// export function agentStarted(roomId: string): AgentEvent {
//     return { type: "agent.started", agentId: "debug_agent", roomId };
// }

// export function agentStatus(roomId: string, status: string): AgentEvent {
//     return { type: "agent.status", agentId: "debug_agent", roomId, status };
// }

// export function agentMessage(roomId: string, content: string): AgentEvent {
//     return { type: "agent.message", agentId: "debug_agent", roomId, content };
// }

// export function agentToolStarted(roomId: string, tool: string): AgentEvent {
//     return { type: "agent.tool_started", agentId: "debug_agent", roomId, tool };
// }

// export function agentToolFinished(roomId: string, tool: string, content?: string): AgentEvent {
//     return { type: "agent.tool_finished", agentId: "debug_agent", roomId, tool, content };
// }

// export function agentFinished(roomId: string, content: string): AgentEvent {
//     return { type: "agent.finished", agentId: "debug_agent", roomId, content };
// }

// export function agentError(roomId: string, content: string): AgentEvent {
//     return { type: "agent.error", agentId: "debug_agent", roomId, content };
// }






// ============================================================
// AGENT TOOL TYPE
// ============================================================
//
// A minimal, framework-free description of a tool the agent can
// call. `parameters` is a JSON Schema object describing the
// arguments, in the same shape the Groq / OpenAI-compatible
// function-calling API expects.
//
export interface AgentTool {
    name: string;
    description: string;
    parameters: object;
    execute: (args: any) => Promise<string>;
}