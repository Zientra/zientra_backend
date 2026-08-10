"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mono_room = void 0;
const ws_1 = require("ws");
class mono_room {
    constructor(id, join_c, name, mem, ag, msg, ts, code = "", language = "javascript") {
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
    add_user(user) {
        this.members.set(user.user_id, user);
    }
    remove_user(user_id) {
        this.members.delete(user_id);
    }
    add_message(message) {
        this.messages.push(message);
    }
    update_code(code) {
        this.code = code;
    }
    set_language(language) {
        this.language = language;
    }
    broadcast(message, excludeUserId) {
        const data = JSON.stringify(message);
        for (const member of this.members.values()) {
            if (member.user_id !== excludeUserId &&
                member.socket.readyState === ws_1.WebSocket.OPEN) {
                member.socket.send(data);
            }
        }
    }
    get_members() {
        return Array.from(this.members.values()).map(member => ({
            user_id: member.user_id,
            username: member.username,
            display_name: member.display_name
        }));
    }
}
exports.mono_room = mono_room;
