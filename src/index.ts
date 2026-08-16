// // Main file

// // compile ts:
// // tsc -b
// // node dist/index.js

// import { WebSocketServer, WebSocket } from "ws";
// import { room_pond } from "./dtypes/room_pond";
// import { Message } from "./dtypes/message";
// import { handleDebugAgentTrigger } from "./agents/debug_agent";
// import "dotenv/config";

// const PORT = Number(process.env.PORT) || 8080;

// const wss = new WebSocketServer({
//     port: PORT,
// });

// const all_rooms = new room_pond();

// wss.on("connection", (ws: WebSocket) => {

//     ws.send("connected");

//     ws.on("message", (message) => {

//         try {

//             const data = JSON.parse(message.toString());

//             switch (data.type) {

//                 // CREATE ROOM
//                 case "create_room": {

//                     try {

//                         const { room_name } = data;

//                         if (!room_name) {
//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "room_name is required"
//                             }));

//                             break;
//                         }

//                         const {
//                             room_id,
//                             join_code
//                         } = all_rooms.create_room(room_name);

//                         ws.send(JSON.stringify({
//                             type: "room_created",
//                             room_id: room_id,
//                             join_code: join_code,
//                             room_name: room_name
//                         }));

//                     } catch (err) {

//                         console.log(err);

//                         ws.send(JSON.stringify({
//                             type: "error",
//                             message: "Could not create room"
//                         }));
//                     }

//                     break;
//                 }

//                 // JOIN ROOM
//                 case "join_room": {

//                     try {

//                         const {
//                             join_code,
//                             username,
//                             display_name
//                         } = data;


//                         if (!join_code || !username) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "join_code and username are required"
//                             }));

//                             break;
//                         }


//                         const {
//                             room,
//                             user
//                         } = all_rooms.add_user_to_room(
//                             join_code,
//                             username,
//                             display_name,
//                             ws
//                         );


//                         ws.send(JSON.stringify({

//                             type: "join_room_success",

//                             room_id: room.id,
//                             join_code: room.join_code,
//                             room_name: room.name,

//                             user: {

//                                 user_id: user.user_id,
//                                 username: user.username,
//                                 display_name: user.display_name

//                             }

//                         }));

//                     }
//                     catch (err) {

//                         console.log(err);

//                         ws.send(JSON.stringify({
//                             type: "error",
//                             message: "Room not found"
//                         }));
//                     }

//                     break;
//                 }

//                 // CHAT WITH TEAM AND AGENTS
//                 case "send_message": {

//                     try {

//                         const {
//                             content
//                         } = data;

//                         if (!content) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "content is required"
//                             }));

//                             break;
//                         }


//                         // Find the user associated with this WebSocket
//                         const sender = all_rooms.get_user_by_socket(ws);

//                         if (!sender) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not connected as a user"
//                             }));

//                             break;
//                         }


//                         // Find the room the user is currently in
//                         const room = all_rooms.get_user_room(ws);

//                         if (!room) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not currently in a room"
//                             }));

//                             break;
//                         }


//                         // Create message
//                         const msg = new Message(
//                             room.id,

//                             sender.user_id,
//                             sender.username,
//                             sender.display_name,

//                             content
//                         );


//                         // Store message
//                         room.add_message(msg);


//                         // Broadcast message to room
//                         room.broadcast({

//                             type: "message",

//                             content: msg

//                         });


//                         // Check for @debug_agent mention and trigger agent if present
//                         // Fire-and-forget: errors are caught inside the agent
//                         handleDebugAgentTrigger(room, content).catch((err) => {
//                             console.error("[DebugAgent] Unhandled trigger error:", err);
//                         });

//                     }
//                     catch (err) {

//                         console.error(
//                             "Message error:",
//                             err
//                         );

//                         ws.send(JSON.stringify({
//                             type: "error",
//                             message: "Could not send message"
//                         }));
//                     }

//                     break;
//                 }

//                 // UPDATE CODE
//                 case "update_code": {

//                     try {

//                         const {
//                             content
//                         } = data;

//                         if (typeof content !== "string") {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "Code content must be a string"
//                             }));

//                             break;
//                         }

//                         const sender = all_rooms.get_user_by_socket(ws);

//                         if (!sender) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not connected as a user"
//                             }));

//                             break;
//                         }

//                         const room = all_rooms.get_user_room(ws);

//                         if (!room) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not currently in a room"
//                             }));

//                             break;
//                         }

//                         room.update_code(content);

//                         room.broadcast({

//                             type: "code_updated",

//                             code: {
//                                 content: room.code,
//                                 language: room.language
//                             },

//                             updated_by: {
//                                 user_id: sender.user_id,
//                                 username: sender.username,
//                                 display_name: sender.display_name
//                             }

//                         }, sender.user_id);

//                     }
//                     catch (err) {

//                         console.error(
//                             "Code update error:",
//                             err
//                         );

//                         ws.send(JSON.stringify({
//                             type: "error",
//                             message: "Could not update code"
//                         }));
//                     }

//                     break;
//                 }

//                 // CHANGE THE LANGUAGE  
//                 case "change_language": {

//                     try {

//                         const {
//                             language
//                         } = data;

//                         if (!language) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "language is required"
//                             }));

//                             break;
//                         }

//                         const sender = all_rooms.get_user_by_socket(ws);

//                         if (!sender) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not connected as a user"
//                             }));

//                             break;
//                         }

//                         const room = all_rooms.get_user_room(ws);

//                         if (!room) {

//                             ws.send(JSON.stringify({
//                                 type: "error",
//                                 message: "You are not currently in a room"
//                             }));

//                             break;
//                         }

//                         room.set_language(language);

//                         room.broadcast({

//                             type: "language_changed",

//                             language,

//                             changed_by: {
//                                 user_id: sender.user_id,
//                                 username: sender.username,
//                                 display_name: sender.display_name
//                             }

//                         });

//                     }
//                     catch (err) {

//                         console.error(
//                             "Language change error:",
//                             err
//                         );

//                     }

//                     break;
//                 }
//             }

//         } catch (error) {

//             ws.send(JSON.stringify({
//                 type: "error",
//                 message: "Invalid message format"
//             }));

//         }
//     });

//     ws.on("close", () => {

//         console.log("Connection closed");

//         all_rooms.remove_user(ws);

//     });

// });


// export { wss };






// Main WebSocket server
//
// Compile:
// tsc -b
//
// Run:
// node dist/index.js

import { WebSocketServer, WebSocket } from "ws";

import { room_pond } from "./dtypes/room_pond";
import { Message } from "./dtypes/message";
import { handleDebugAgentTrigger } from "./agents/debug_agent";

import "dotenv/config";


// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT) || 8080;


// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss = new WebSocketServer({
    port: PORT
});


// ============================================================
// ROOM STORAGE
// ============================================================

const all_rooms = new room_pond();


// ============================================================
// SERVER EVENTS
// ============================================================

wss.on("listening", () => {

    console.log(
        `WebSocket server running on ws://localhost:${PORT}`
    );

});

wss.on("error", (error) => {

    console.error(
        "[WebSocket Server Error]",
        error
    );

});


// ============================================================
// CONNECTION
// ============================================================

wss.on("connection", (ws: WebSocket) => {

    console.log(
        "[WS] Client connected"
    );


    // ========================================================
    // SOCKET ERROR
    // ========================================================

    ws.on("error", (error) => {

        console.error(
            "[WS] Client socket error:",
            error
        );

    });


    // ========================================================
    // INITIAL CONNECTION MESSAGE
    // ========================================================
    //
    // IMPORTANT:
    // The frontend uses JSON.parse(event.data).
    //
    // Therefore NEVER send:
    //
    // ws.send("connected");
    //
    // Always send JSON.
    //

    if (ws.readyState === WebSocket.OPEN) {

        ws.send(
            JSON.stringify({
                type: "connected"
            })
        );

    }


    // ========================================================
    // MESSAGE
    // ========================================================

    ws.on("message", (message) => {

        try {

            const rawMessage = message.toString();

            console.log(
                "[WS] Raw message:",
                rawMessage
            );


            // ------------------------------------------------
            // Parse JSON
            // ------------------------------------------------

            const data = JSON.parse(
                rawMessage
            );


            console.log(
                "[WS] Message type:",
                data.type
            );


            // ====================================================
            // SWITCH
            // ====================================================

            switch (data.type) {


                // ====================================================
                // CREATE ROOM
                // ====================================================

                case "create_room": {

                    console.log(
                        "[WS] Creating room..."
                    );


                    try {

                        const {
                            room_name
                        } = data;


                        if (
                            typeof room_name !== "string" ||
                            !room_name.trim()
                        ) {

                            ws.send(
                                JSON.stringify({
                                    type: "error",
                                    message: "room_name is required"
                                })
                            );

                            break;
                        }


                        // ------------------------------------------------
                        // Create room
                        // ------------------------------------------------

                        const {
                            room_id,
                            join_code
                        } = all_rooms.create_room(
                            room_name.trim()
                        );


                        console.log(
                            "[WS] Room created:",
                            {
                                room_id,
                                join_code,
                                room_name
                            }
                        );


                        // ------------------------------------------------
                        // Send response
                        // ------------------------------------------------

                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "room_created",

                                    room_id,

                                    join_code,

                                    room_name:
                                        room_name.trim()

                                })
                            );

                        }


                        console.log(
                            "[WS] room_created sent"
                        );

                    }
                    catch (err) {

                        console.error(
                            "[WS] Create room error:",
                            err
                        );


                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Could not create room"

                                })
                            );

                        }

                    }


                    break;
                }



                // ====================================================
                // JOIN ROOM
                // ====================================================

                case "join_room": {

                    console.log(
                        "[WS] Joining room..."
                    );


                    try {

                        const {
                            join_code,
                            username,
                            display_name
                        } = data;


                        if (
                            typeof join_code !== "string" ||
                            !join_code.trim() ||
                            typeof username !== "string" ||
                            !username.trim()
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "join_code and username are required"

                                })
                            );

                            break;
                        }


                        // ------------------------------------------------
                        // Add user
                        // ------------------------------------------------

                        const {
                            room,
                            user
                        } = all_rooms.add_user_to_room(

                            join_code.trim(),

                            username.trim(),

                            display_name || username.trim(),

                            ws

                        );


                        console.log(
                            "[WS] User joined:",
                            {
                                user_id:
                                    user.user_id,

                                username:
                                    user.username,

                                room_id:
                                    room.id
                            }
                        );


                        // ------------------------------------------------
                        // Send success
                        // ------------------------------------------------

                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type:
                                        "join_room_success",

                                    room_id:
                                        room.id,

                                    join_code:
                                        room.join_code,

                                    room_name:
                                        room.name,

                                    user: {

                                        user_id:
                                            user.user_id,

                                        username:
                                            user.username,

                                        display_name:
                                            user.display_name

                                    }

                                })
                            );

                        }

                    }
                    catch (err) {

                        console.error(
                            "[WS] Join room error:",
                            err
                        );


                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Room not found"

                                })
                            );

                        }

                    }


                    break;
                }



                // ====================================================
                // SEND MESSAGE
                // ====================================================
                //
                // This handles BOTH:
                //
                // 1. Normal chat
                //
                // 2. @debug_agent commands
                //
                // There is NO separate WebSocket route.
                //
                // ====================================================

                case "send_message": {

                    console.log(
                        "[WS] send_message received"
                    );


                    try {

                        const {
                            content
                        } = data;


                        // ------------------------------------------------
                        // Validate content
                        // ------------------------------------------------

                        if (
                            typeof content !== "string" ||
                            !content.trim()
                        ) {

                            if (
                                ws.readyState === WebSocket.OPEN
                            ) {

                                ws.send(
                                    JSON.stringify({

                                        type: "error",

                                        message:
                                            "content is required"

                                    })
                                );

                            }

                            break;
                        }


                        const messageContent =
                            content.trim();


                        // ------------------------------------------------
                        // Find sender
                        // ------------------------------------------------

                        const sender =
                            all_rooms.get_user_by_socket(
                                ws
                            );


                        if (!sender) {

                            console.error(
                                "[WS] Sender not found"
                            );


                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not connected as a user"

                                })
                            );

                            break;
                        }


                        // ------------------------------------------------
                        // Find room
                        // ------------------------------------------------

                        const room =
                            all_rooms.get_user_room(
                                ws
                            );


                        if (!room) {

                            console.error(
                                "[WS] Room not found for sender"
                            );


                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not currently in a room"

                                })
                            );

                            break;
                        }


                        console.log(
                            "[WS] Message from:",
                            sender.username
                        );

                        console.log(
                            "[WS] Room:",
                            room.id
                        );

                        console.log(
                            "[WS] Content:",
                            messageContent
                        );


                        // =================================================
                        // CREATE MESSAGE
                        // =================================================

                        const msg = new Message(

                            room.id,

                            sender.user_id,

                            sender.username,

                            sender.display_name,

                            messageContent

                        );


                        // =================================================
                        // STORE MESSAGE
                        // =================================================

                        room.add_message(
                            msg
                        );


                        // =================================================
                        // BROADCAST NORMAL CHAT MESSAGE
                        // =================================================

                        room.broadcast({

                            type: "message",

                            content: msg

                        });


                        console.log(
                            "[WS] Message broadcasted"
                        );


                        // =================================================
                        // DEBUG AGENT
                        // =================================================
                        //
                        // IMPORTANT:
                        //
                        // Agent is triggered through the SAME
                        // send_message event.
                        //
                        // Frontend sends:
                        //
                        // {
                        //     type: "send_message",
                        //     content: "@debug_agent fix the bug"
                        // }
                        //
                        // No new WebSocket connection.
                        // No new WebSocket path.
                        //
                        // =================================================

                        if (messageContent.includes("@debug_agent")) {
                            console.log(`[DebugAgent] Triggered in room ${room.id}`);

                            // Don't await — the agent can take a while, and errors are
                            // already reported to the room from inside the handler.
                            void handleDebugAgentTrigger(room, messageContent).catch((error) => {
                                console.error("[DebugAgent] Unhandled trigger error:", error);
                            });
                        }

                    }
                    catch (err) {

                        console.error(
                            "[WS] Message error:",
                            err
                        );


                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Could not send message"

                                })
                            );

                        }

                    }


                    break;
                }



                // ====================================================
                // UPDATE CODE
                // ====================================================

                case "update_code": {

                    try {

                        const {
                            content
                        } = data;


                        if (
                            typeof content !== "string"
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Code content must be a string"

                                })
                            );

                            break;
                        }


                        const sender =
                            all_rooms.get_user_by_socket(
                                ws
                            );


                        if (!sender) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not connected as a user"

                                })
                            );

                            break;
                        }


                        const room =
                            all_rooms.get_user_room(
                                ws
                            );


                        if (!room) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not currently in a room"

                                })
                            );

                            break;
                        }


                        // ------------------------------------------------
                        // Update code
                        // ------------------------------------------------

                        room.update_code(
                            content
                        );


                        // ------------------------------------------------
                        // Broadcast
                        // ------------------------------------------------

                        room.broadcast({

                            type:
                                "code_updated",

                            code: {

                                content:
                                    room.code,

                                language:
                                    room.language

                            },

                            updated_by: {

                                user_id:
                                    sender.user_id,

                                username:
                                    sender.username,

                                display_name:
                                    sender.display_name

                            }

                        }, sender.user_id);

                    }
                    catch (err) {

                        console.error(
                            "[WS] Code update error:",
                            err
                        );


                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Could not update code"

                                })
                            );

                        }

                    }


                    break;
                }



                // ====================================================
                // CHANGE LANGUAGE
                // ====================================================

                case "change_language": {

                    try {

                        const {
                            language
                        } = data;


                        if (
                            typeof language !== "string" ||
                            !language.trim()
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "language is required"

                                })
                            );

                            break;
                        }


                        const sender =
                            all_rooms.get_user_by_socket(
                                ws
                            );


                        if (!sender) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not connected as a user"

                                })
                            );

                            break;
                        }


                        const room =
                            all_rooms.get_user_room(
                                ws
                            );


                        if (!room) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "You are not currently in a room"

                                })
                            );

                            break;
                        }


                        // ------------------------------------------------
                        // Update language
                        // ------------------------------------------------

                        room.set_language(
                            language.trim()
                        );


                        // ------------------------------------------------
                        // Broadcast
                        // ------------------------------------------------

                        room.broadcast({

                            type:
                                "language_changed",

                            language:
                                language.trim(),

                            changed_by: {

                                user_id:
                                    sender.user_id,

                                username:
                                    sender.username,

                                display_name:
                                    sender.display_name

                            }

                        });

                    }
                    catch (err) {

                        console.error(
                            "[WS] Language change error:",
                            err
                        );


                        if (
                            ws.readyState === WebSocket.OPEN
                        ) {

                            ws.send(
                                JSON.stringify({

                                    type: "error",

                                    message:
                                        "Could not change language"

                                })
                            );

                        }

                    }


                    break;
                }



                // ====================================================
                // UNKNOWN MESSAGE
                // ====================================================

                default: {

                    console.warn(
                        "[WS] Unknown message type:",
                        data.type
                    );


                    if (
                        ws.readyState === WebSocket.OPEN
                    ) {

                        ws.send(
                            JSON.stringify({

                                type: "error",

                                message:
                                    `Unknown message type: ${data.type}`

                            })
                        );

                    }

                    break;
                }

            }

        }
        catch (error) {

            console.error(
                "[WS] Invalid message:",
                error
            );


            if (
                ws.readyState === WebSocket.OPEN
            ) {

                ws.send(
                    JSON.stringify({

                        type: "error",

                        message:
                            "Invalid message format"

                    })
                );

            }

        }

    });


    // ========================================================
    // DISCONNECT
    // ========================================================

    ws.on("close", (code, reason) => {

        console.log(
            "[WS] Connection closed"
        );

        console.log(
            "[WS] Close code:",
            code
        );

        console.log(
            "[WS] Close reason:",
            reason.toString()
        );


        // ----------------------------------------------------
        // Remove user from room
        // ----------------------------------------------------

        try {

            all_rooms.remove_user(
                ws
            );

        }
        catch (error) {

            console.error(
                "[WS] Error removing user:",
                error
            );

        }

    });

});


// ============================================================
// EXPORT
// ============================================================

export {
    wss
};