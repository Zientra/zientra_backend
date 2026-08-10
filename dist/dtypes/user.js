"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const uuid_1 = require("uuid");
class User {
    constructor(username, socket, display_name) {
        this.user_id = (0, uuid_1.v4)();
        this.username = username;
        this.display_name = display_name !== null && display_name !== void 0 ? display_name : username;
        this.socket = socket;
        this.created_at = new Date();
    }
}
exports.User = User;
