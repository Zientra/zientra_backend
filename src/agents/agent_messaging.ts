import { mono_room } from "../dtypes/Mono_room";
import { Message } from "../dtypes/message";

// ============================================================
// SHARED AGENT MESSAGING HELPER
// ============================================================
//
// Every agent (debug, developer, tester, ...) sends chat updates
// through this one helper, which reuses the exact same mechanism
// the human chat path uses in index.ts: `Message` + `room.add_message`
// + `room.broadcast`. No new WebSocket method is introduced, and no
// agent defines its own private copy of this function.
//
export function sendAgentMessage(
    room: mono_room,
    agentUserId: string,
    agentUsername: string,
    agentDisplayName: string,
    content: string
) {
    const msg = new Message(
        room.id,
        agentUserId,
        agentUsername,
        agentDisplayName,
        content
    );

    room.add_message(msg);

    room.broadcast({
        type: "message",
        content: msg
    });
}