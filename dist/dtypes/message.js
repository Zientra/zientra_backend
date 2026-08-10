"use strict";
// Chat between team and agents 
// main chat application file
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const uuid_1 = require("uuid");
class Message {
    constructor(room_id, sender_id, sender_username, sender_display_name, content) {
        this.message_id = (0, uuid_1.v4)();
        this.room_id = room_id;
        this.sender_id = sender_id;
        this.sender_username = sender_username;
        this.sender_display_name = sender_display_name;
        this.content = content;
        this.created_at = new Date();
    }
}
exports.Message = Message;
