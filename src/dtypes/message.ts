// Chat between team and agents 
// main chat application file

import { v4 as uuidv4 } from "uuid";

export class Message {

    message_id: string;

    room_id: string;

    sender_id: string;
    sender_username: string;
    sender_display_name: string;

    content: string;

    created_at: Date;

    constructor(
        room_id: string,
        sender_id: string,
        sender_username: string,
        sender_display_name: string,
        content: string
    ) {
        this.message_id = uuidv4();

        this.room_id = room_id;

        this.sender_id = sender_id;
        this.sender_username = sender_username;
        this.sender_display_name = sender_display_name;

        this.content = content;

        this.created_at = new Date();
    }
}