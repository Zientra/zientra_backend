import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { mono_room } from "../../dtypes/Mono_room";
import { AgentTool } from "../types";

const COMMAND_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_CHARS = 4000;

// Map editor language -> command used to run a single-file snippet
const RUNNERS: Record<string, (file: string) => string> = {
    javascript: (file) => `node "${file}"`,
    typescript: (file) => `npx ts-node "${file}"`,
    python: (file) => `python3 "${file}"`
};

const EXTENSIONS: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py"
};

// ============================================================
// RUN THE CURRENT CODE BUFFER
// ============================================================
//
// Writes the room's current code to a throwaway temp file and
// executes it, so the agent can verify a fix instead of just
// claiming it works. Only a small set of languages are runnable
// this way; anything else is reported as unsupported and the
// agent has to reason from the code alone.
//
export function createRunCodeTool(room: mono_room): AgentTool {
    return {
        name: "run_current_code",
        description:
            "Execute the code currently in the editor and see its output/errors, to verify a fix actually works. Supports javascript, typescript, and python only.",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        execute: async () => {
            const language = room.language;
            const runnerFor = RUNNERS[language];
            const extension = EXTENSIONS[language];

            if (!runnerFor || !extension) {
                return `Execution is not supported for language "${language}". Reason about the fix from the code alone.`;
            }

            const fileName = `debug_agent_${randomUUID()}.${extension}`;
            const filePath = path.join(os.tmpdir(), fileName);

            try {
                await fs.writeFile(filePath, room.code, "utf-8");

                const command = runnerFor(filePath);

                return await new Promise<string>((resolve) => {
                    exec(
                        command,
                        { timeout: COMMAND_TIMEOUT_MS },
                        (error, stdout, stderr) => {
                            const output = `${stdout}\n${stderr}`.slice(-MAX_OUTPUT_CHARS);
                            resolve(
                                error
                                    ? `Execution failed.\n${output}`
                                    : (output || "(no output)")
                            );
                        }
                    );
                });
            }
            finally {
                await fs.unlink(filePath).catch(() => { });
            }
        }
    };
}