// ============================================================
// GROQ CLIENT
// ============================================================
//
// Groq's API is OpenAI-compatible, so a plain fetch call against
// /chat/completions is all that's needed — no SDK required.
//
// Requires Node 18+ (global fetch). If you're on an older Node,
// install "node-fetch" and swap the fetch call below.
//

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface GroqMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: GroqToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface GroqToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: object;
    };
}

// ============================================================
// SEND ONE CHAT COMPLETION REQUEST
// ============================================================
export async function callGroq(
    messages: GroqMessage[],
    tools: GroqToolDefinition[],
    model: string
): Promise<GroqMessage> {

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? "auto" : undefined,
            temperature: 0
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Groq API error (${response.status}): ${errorText}`
        );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message) {
        throw new Error("Groq API returned no message");
    }

    return choice.message as GroqMessage;
}