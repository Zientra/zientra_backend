// Main file 


// compile ts : 
// tsc -b 
// node dist/index.js

import { WebSocketServer,WebSocket } from "ws";
import { room_pond } from "./dtypes/room_pond";
import { mono_room } from "./dtypes/Mono_room";

const PORT = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({
    port: PORT,
});

const all_rooms = new room_pond();



wss.on("connection", (ws: WebSocket) => {
    // Send a welcome message immediately upon connection
    ws.send("connected");

    // will get a req from frontend to add a team_mem 
   ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());

            switch (data.type) {

                case "add_room":
                    try{
                        const {room_id, curr_room } = data;
                        all_rooms.add_room(room_id,curr_room);
                    }
                    catch(err){
                        console.log(err);
                    }
            }

        } catch (error) {
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
            }));
        }
    });

   ws.on("close", () => {
    ws.send("Connection closed.");
   })
});


export { wss };