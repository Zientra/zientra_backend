"use strict";
// Main file
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
// compile ts:
// tsc -b
// node dist/index.js
const ws_1 = require("ws");
const room_pond_1 = require("./dtypes/room_pond");
const message_1 = require("./dtypes/message");
const PORT = Number(process.env.PORT) || 8080;
const wss = new ws_1.WebSocketServer({
    port: PORT,
});
exports.wss = wss;
const all_rooms = new room_pond_1.room_pond();
wss.on("connection", (ws) => {
    ws.send("connected");
    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());
            switch (data.type) {
                // CREATE ROOM
                case "create_room": {
                    try {
                        const { room_name } = data;
                        if (!room_name) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "room_name is required"
                            }));
                            break;
                        }
                        const { room_id, join_code } = all_rooms.create_room(room_name);
                        ws.send(JSON.stringify({
                            type: "room_created",
                            room_id: room_id,
                            join_code: join_code,
                            room_name: room_name
                        }));
                    }
                    catch (err) {
                        console.log(err);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Could not create room"
                        }));
                    }
                    break;
                }
                // JOIN ROOM
                case "join_room": {
                    try {
                        const { join_code, username, display_name } = data;
                        if (!join_code || !username) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "join_code and username are required"
                            }));
                            break;
                        }
                        const { room, user } = all_rooms.add_user_to_room(join_code, username, display_name, ws);
                        ws.send(JSON.stringify({
                            type: "join_room_success",
                            room_id: room.id,
                            join_code: room.join_code,
                            room_name: room.name,
                            user: {
                                user_id: user.user_id,
                                username: user.username,
                                display_name: user.display_name
                            }
                        }));
                    }
                    catch (err) {
                        console.log(err);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Room not found"
                        }));
                    }
                    break;
                }
                case "send_message": {
                    try {
                        const { content } = data;
                        if (!content) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "content is required"
                            }));
                            break;
                        }
                        // Find the user associated with this WebSocket
                        const sender = all_rooms.get_user_by_socket(ws);
                        if (!sender) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "You are not connected as a user"
                            }));
                            break;
                        }
                        // Find the room the user is currently in
                        const room = all_rooms.get_user_room(ws);
                        if (!room) {
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "You are not currently in a room"
                            }));
                            break;
                        }
                        // Create message
                        const msg = new message_1.Message(room.id, sender.user_id, sender.username, sender.display_name, content);
                        // Store message
                        room.add_message(msg);
                        // Broadcast message to room
                        room.broadcast({
                            type: "message",
                            content: msg
                        });
                    }
                    catch (err) {
                        console.error("Message error:", err);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Could not send message"
                        }));
                    }
                    break;
                }
            }
        }
        catch (error) {
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
            }));
        }
    });
    ws.on("close", () => {
        console.log("Connection closed");
        all_rooms.remove_user(ws);
    });
});
