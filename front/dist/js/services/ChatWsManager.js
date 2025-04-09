import { WebSocketManager } from "./WebSocketManager.js";

let wsChatManagerInstance = null; // ?

class ChatWsManager extends WebSocketManager {
    constructor() {
        if (wsChatManagerInstance) {
            return wsChatManagerInstance;
        }
        super('chat');
        wsChatManagerInstance = this;
    }
}

export const chatWebSocket = new ChatWsManager();