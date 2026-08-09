"use strict";
// Main file 
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = void 0;
// compile ts : 
// tsc -b 
// node dist/index.js
const ws_1 = require("ws");
const PORT = Number(process.env.PORT) || 8080;
const wss = new ws_1.WebSocketServer({
    port: PORT,
});
exports.wss = wss;
wss.on("connection", (ws) => {
    // Send a welcome message immediately upon connection
    ws.send("connected");
    // will get a req from frontend to add a team_mem 
    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());
            switch (data.type) {
                case "join_room":
                    const u = JSON.parse(message.toString());
                    ws.emit(`User ${u.user} joined`);
                    break;
                default:
                    console.log("Unknown message type:", data.type);
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
        ws.send("Connection closed.");
    });
});
