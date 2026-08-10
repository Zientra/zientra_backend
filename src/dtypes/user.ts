import { v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";

export class User {

    user_id: string;
    username: string;
    display_name: string;

    socket: WebSocket;

    // Room the user is currently connected to
    current_room_id?: string;

    created_at: Date;

    constructor(
        username: string,
        socket: WebSocket,
        display_name?: string
    ) {
        this.user_id = uuidv4();

        this.username = username;
        this.display_name = display_name ?? username;

        this.socket = socket;

        this.created_at = new Date();
    }
}