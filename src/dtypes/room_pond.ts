// contains all room_ids (socket id)
// multiple mono_rooms 

import { mono_room } from "./Mono_room";
import { WebSocket } from "ws";

export class room_pond{
    rooms : Map<string, mono_room>; // room_id,socket_id

    constructor(){
        this.rooms = new Map<string,mono_room>;
    }

    add_room(room_id:string, room : mono_room){
        // adds room in the rooms map 
        this.rooms.set(room_id,room);
    }
}