"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mono_room = void 0;
// This is proto of single room 
// Multiple rooms exist -> Checkout index.ts
class mono_room {
    constructor(Id, name, mem, ag, msg, ts) {
        this.id = Id;
        this.name = name;
        this.members = mem;
        this.agents = ag;
        this.messages = msg;
        this.tasks = ts;
    }
    add_user(user_Id) {
        if (!this.members) {
            this.members = [];
        }
        try {
            this.members.push(user_Id);
        }
        catch (err) {
            console.log(err);
        }
    }
}
exports.mono_room = mono_room;
