import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { mono_room } from "../../dtypes/Mono_room";
import { AgentTool } from "../types";

const COMMAND_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_CHARS = 4000;

const EXTENSIONS: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py"
};

const RUNNERS: Record<string, (file: string) => string> = {
    javascript: (file) => `node "${file}"`,
    typescript: (file) => `npx ts-node "${file}"`,
    python: (file) => `python3 "${file}"`
};

// ============================================================
// RUN GENERATED TESTS AGAINST THE CURRENT CODE BUFFER
// ============================================================
//
// Unlike run_code_tools.ts, this tool never touches room.code —
// testing is read-only with respect to the shared editor. It
// writes the CURRENT code plus the agent's generated test code
// into one throwaway temp file, executes it, and returns the
// output so the agent can report real pass/fail results instead
// of asserting they passed.
//
// The generated test code is expected to print its own pass/fail
// output (console.log/console.assert for JS/TS, print/assert for
// Python) — the tool just runs it and returns whatever it printed.
//
export function createTestRunnerTool(room: mono_room): AgentTool {
    return {
        name: "run_tests_against_code",
        description:
            "Run generated test code against the code currently in the editor, without modifying the editor. Provide complete, runnable test code that prints its own clear pass/fail output (e.g. console.log/console.assert for JS/TS, print/assert for Python). The test code can reference top-level functions/consts from the current code directly, since both are combined into one file before running. Supports javascript, typescript, and python only.",
        parameters: {
            type: "object",
            properties: {
                test_code: {
                    type: "string",
                    description: "Complete test code to run against the current code, printing clear pass/fail results."
                }
            },
            required: ["test_code"]
        },
        execute: async (args: { test_code: string }) => {
            const language = room.language;
            const runnerFor = RUNNERS[language];
            const extension = EXTENSIONS[language];

            if (!runnerFor || !extension) {
                return `Test execution is not supported for language "${language}". Reason about correctness from the code alone.`;
            }

            const fileName = `tester_agent_${randomUUID()}.${extension}`;
            const filePath = path.join(os.tmpdir(), fileName);

            // Combine the current code with the generated tests into one
            // runnable file. Tests are appended after the code so they can
            // reference whatever the code defines.
            const combinedSource =
                `${room.code}\n\n// ==== GENERATED TESTS ====\n\n${args.test_code}\n`;

            try {
                await fs.writeFile(filePath, combinedSource, "utf-8");

                const command = runnerFor(filePath);

                return await new Promise<string>((resolve) => {
                    exec(
                        command,
                        { timeout: COMMAND_TIMEOUT_MS },
                        (error, stdout, stderr) => {
                            const output = `${stdout}\n${stderr}`.slice(-MAX_OUTPUT_CHARS);
                            resolve(
                                error
                                    ? `Tests exited with an error.\n${output}`
                                    : (output || "(tests produced no output)")
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