"use strict";
// contains all rooms
// multiple mono_rooms
Object.defineProperty(exports, "__esModule", { value: true });
exports.room_pond = void 0;
const Mono_room_1 = require("./Mono_room");
const uuid_1 = require("uuid");
const user_1 = require("./user");
class room_pond {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
    }
    create_room(room_name) {
        const room_id = (0, uuid_1.v4)();
        const join_code = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
        const room = new Mono_room_1.mono_room(room_id, join_code, room_name, new Map(), [], [], []);
        this.rooms.set(room_id, room);
        return {
            room_id,
            join_code
        };
    }
    add_user_to_room(join_code, username, display_name, socket) {
        const currRoom = this.get_room_by_code(join_code);
        if (!currRoom) {
            throw new Error("Room not found");
        }
        const user = new user_1.User(username, socket, display_name);
        user.current_room_id = currRoom.id;
        this.users.set(socket, user);
        currRoom.add_user(user);
        // Send current room state to new user
        socket.send(JSON.stringify({
            type: "room_state",
            room: {
                room_id: currRoom.id,
                join_code: currRoom.join_code,
                room_name: currRoom.name
            },
            members: currRoom.get_members(),
            code: {
                content: currRoom.code,
                language: currRoom.language
            }
        }));
        // Notify existing users
        currRoom.broadcast({
            type: "user_joined",
            room_id: currRoom.id,
            user: {
                user_id: user.user_id,
                username: user.username,
                display_name: user.display_name
            }
        }, user.user_id);
        return {
            room: currRoom,
            user: user
        };
    }
    // find room by join_code
    get_room_by_code(join_code) {
        for (const room of this.rooms.values()) {
            if (room.join_code === join_code) {
                return room;
            }
        }
        return undefined;
    }
    get_room(room_id) {
        return this.rooms.get(room_id);
    }
    get_user_by_socket(socket) {
        return this.users.get(socket);
    }
    // current room of the user
    get_user_room(socket) {
        const user = this.users.get(socket);
        if (!user || !user.current_room_id) {
            return undefined;
        }
        return this.rooms.get(user.current_room_id);
    }
    remove_user(socket) {
        const user = this.users.get(socket);
        if (!user) {
            return;
        }
        const room = this.get_user_room(socket);
        if (room) {
            room.remove_user(user.user_id);
            room.broadcast({
                type: "user_left",
                room_id: room.id,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    display_name: user.display_name
                }
            });
        }
        this.users.delete(socket);
    }
}
exports.room_pond = room_pond;
