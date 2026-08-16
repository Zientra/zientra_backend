import { mono_room } from "../../dtypes/Mono_room";
import { AgentTool } from "../types";

const AGENT_USER_ID = "debug_agent";
const AGENT_USERNAME = "debug_agent";
const AGENT_DISPLAY_NAME = "Debug Agent";

// ============================================================
// TOOLS THAT OPERATE ON THE ROOM'S LIVE CODE BUFFER
// ============================================================
//
// There is no project on disk here — the "code" is whatever the
// user has typed into the shared Monaco editor, living in memory
// as room.code / room.language. These tools read/write that
// buffer directly and reuse the existing room.update_code() +
// "code_updated" broadcast shape, exactly like the "update_code"
// WebSocket case in index.ts already does.
//
export function createCodeBufferTools(room: mono_room): AgentTool[] {

    const readCodeTool: AgentTool = {
        name: "read_current_code",
        description:
            "Read the code currently in the shared editor, along with its language. Always call this first.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        execute: async () => {
            return JSON.stringify({
                language: room.language,
                code: room.code
            });
        }
    };

    const writeCodeTool: AgentTool = {
        name: "write_fixed_code",
        description:
            "Replace the code in the shared editor with your fixed version. Provide the ENTIRE file contents, not a diff or partial snippet.",
        parameters: {
            type: "object",
            properties: {
                new_code: {
                    type: "string",
                    description: "The complete, corrected code to put in the editor"
                }
            },
            required: ["new_code"]
        },
        execute: async (args: { new_code: string }) => {
            room.update_code(args.new_code);

            room.broadcast({
                type: "code_updated",
                code: {
                    content: room.code,
                    language: room.language
                },
                updated_by: {
                    user_id: AGENT_USER_ID,
                    username: AGENT_USERNAME,
                    display_name: AGENT_DISPLAY_NAME
                }
            });

            return `Editor updated with ${args.new_code.length} characters of fixed code.`;
        }
    };

    return [readCodeTool, writeCodeTool];
}