// contains all rooms
// multiple mono_rooms

import { WebSocket } from "ws";
import { mono_room } from "./Mono_room";
import { v4 as uuidv4 } from "uuid";
import { User } from "./user";

export class room_pond {

    rooms: Map<string, mono_room>;

    // WebSocket -> User
    users: Map<WebSocket, User>;

    constructor() {

        this.rooms = new Map<string, mono_room>();

        this.users = new Map<WebSocket, User>();
    }

    create_room(room_name: string) {

        const room_id = uuidv4();

        const join_code = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

        const room = new mono_room(
            room_id,
            join_code,
            room_name,
            new Map(),
            [],
            [],
            []
        );

        this.rooms.set(room_id, room);

        return {
            room_id,
            join_code
        };
    }

    add_user_to_room(
        join_code: string,
        username: string,
        display_name: string,
        socket: WebSocket
    ) {

        const currRoom = this.get_room_by_code(join_code);

        if (!currRoom) {
            throw new Error("Room not found");
        }

        const user = new User(
            username,
            socket,
            display_name
        );

        // Associate user with this room
        user.current_room_id = currRoom.id;

        // Store user globally by socket
        this.users.set(socket, user);

        // Add user to room
        currRoom.add_user(user);

        // Send existing members to new user
        socket.send(JSON.stringify({
            type: "room_members",
            room_id: currRoom.id,
            join_code: currRoom.join_code,
            room_name: currRoom.name,
            members: currRoom.get_members()
        }));

        // Notify everyone else
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
    get_room_by_code(join_code: string) {

        for (const room of this.rooms.values()) {

            if (room.join_code === join_code) {
                return room;
            }

        }

        return undefined;
    }

    get_room(room_id: string) {

        return this.rooms.get(room_id);

    }


    get_user_by_socket(socket: WebSocket) {

        return this.users.get(socket);

    }

    // current room of the user
    get_user_room(socket: WebSocket) {

        const user = this.users.get(socket);

        if (!user || !user.current_room_id) {
            return undefined;
        }

        return this.rooms.get(user.current_room_id);

    }

    remove_user(socket: WebSocket) {

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