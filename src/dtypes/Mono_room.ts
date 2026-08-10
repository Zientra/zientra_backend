import { WebSocket } from "ws";
import { User } from "./user";
import { Message } from "./message";

export class mono_room {

    id: string;
    join_code: string;
    name: string;

    members: Map<string, User>;

    agents: string[];

    messages: Message[];
    tasks: string[];

    // Code editor state
    code: string;
    language: string;

    repositoryId?: string;
    workspaceId?: string;

    constructor(
        id: string,
        join_c: string,
        name: string,
        mem: Map<string, User>,
        ag: string[],
        msg: Message[],
        ts: string[],
        code: string = "",
        language: string = "javascript"
    ) {
        this.id = id;
        this.name = name;
        this.join_code = join_c;

        this.members = mem;

        this.agents = ag;
        this.messages = msg;
        this.tasks = ts;

        this.code = code;
        this.language = language;
    }

    add_user(user: User) {

        this.members.set(
            user.user_id,
            user
        );
    }

    remove_user(user_id: string) {

        this.members.delete(user_id);
    }

    add_message(message: Message) {

        this.messages.push(message);
    }

    update_code(code: string) {

        this.code = code;
    }

    set_language(language: string) {

        this.language = language;
    }

    broadcast(
        message: object,
        excludeUserId?: string
    ) {

        const data = JSON.stringify(message);

        for (const member of this.members.values()) {

            if (
                member.user_id !== excludeUserId &&
                member.socket.readyState === WebSocket.OPEN
            ) {

                member.socket.send(data);
            }
        }
    }

    get_members() {

        return Array.from(
            this.members.values()
        ).map(member => ({
            user_id: member.user_id,
            username: member.username,
            display_name: member.display_name
        }));

    }
}