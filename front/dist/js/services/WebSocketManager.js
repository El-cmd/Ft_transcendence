import { Fetcher } from "../fetchers/Fetcher.js";
import { logout } from '../accounts/utils.js';
import { router } from "../Router.js";

/**
 * In children classes : 
 *  - Pass ws type at creation : chat, events/game, events/tournament
 *  - subscribe corresponding onMessage handlers (ex : ChatLoader.handleMessage() for the chat ws)
 * 
 */

export class WebSocketManager {
    constructor(type) {
        this.wsType = type;
        this.socket = null;
        this.messageHandlers = new Set(); 
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = []; // Queue to store unsent messages
        this.isRefreshingToken = false; // Prevent multiple refresh calls
    }

    async connect() {
        if (this.isConnected()) {
            return;
        }
        
        // Close any existing socket properly
        if (this.socket) {
            this.socket.onclose = null; // Remove handlers first
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.onopen = null;
            this.socket.close();
            this.socket = null;
        }
        
        const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';
        const host = window.location.host || 'localhost:8000';  // Fallback for development
        
        try {
            const token = await new Fetcher().getValidToken();
            if (!token || token === null) {
                console.error('No access token available');
                logout();
                window.location.hash = '#/login';
                return;
            }
            
            const encodedToken = encodeURIComponent(token);
            const wsUrl = `${protocol}//${host}/ws/${this.wsType}/?token=${encodedToken}`;
            console.log(`Connecting to ${this.wsType} WebSocket...`);
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onerror = this.onError.bind(this);
            
            // Wait for connection but with timeout
            const connected = await this.waitForConnectionWithTimeout(5000);
            if (!connected) {
                console.error(`${this.wsType} WebSocket connection timed out`);
                this.attemptReconnect();
            } else {
                console.log(`${this.wsType} WebSocket connected successfully`);
                // Process any queued messages
                this.processQueue();
            }
        } catch (error) {
            console.error(`Error connecting to ${this.wsType} WebSocket:`, error);
            try {
                await new Fetcher().refreshToken();
                this.attemptReconnect();
            } catch {
                logout();
                router.rerenderCurrentRoute();
            }
        }
    }

    // close code 1000 means normal disconnection
    async disconnect(closeCode = 1000) {
        if (this.socket) {
            this.socket.onclose = (event) => {
                console.log(`Disconnected ${this.wsType} WebSocket with code: ${event.code}`);
                // this.socket = null;
            };
            this.socket.close(closeCode);
        }
    }


    onOpen() {
        console.log(`${this.wsType} WebSocket connected`);
        this.reconnectAttempts = 0;
        this.processQueue();
    }

    onMessage(event) {
        // console.log('Received data through WebSocket');
        const data = JSON.parse(event.data);
        
        if (data.type === "token_expired") {
            // should close the socket 
            this.disconnect(4003);
            try {
                // console.log('Token expired, attempting to refresh');
                this.isRefreshingToken = true;
                this.messageQueue.push(data.data)
                new Fetcher().refreshToken().then(() => {
                    this.attemptReconnect();
                }).catch(() => {
                    console.error('Failed to refresh token');
                    logout();
                    window.location.hash = '#/login';
                }
                );
            } catch (error) {
                console.error('Failed to refresh token', error);
                logout();
                window.location.hash = '#/login';
            } finally {
                this.isRefreshingToken = false;
            }
            // Resend all queued messages
            while (this.messageQueue.length > 0 && this.isConnected()) {
                const queuedMessage = this.messageQueue.shift(); // shift() removes and returns first element of array && updates length.
                this.sendMessage(queuedMessage);
            }
        }
        else
            this.messageHandlers.forEach(handler => handler(data)); // handlemessage is async in ChatLoader and NotificationsHandler -> await here ? 
    }

    sendToCallbacks(data) {
        this.messageHandlers.forEach(handler => handler(data));
    }

    onClose(event) {
        // console.log('WebSocket disconnected by other end');
        if (event.code === 4003) console.debug('expired token');

        // this.disconnectionHandlers.forEach(handler => handler());
        this.socket.close();
        if (event.code != 1000) {
            // console.log('Abnormal closure, attempting to reconnect', event.code);
            this.attemptReconnect();
        }
    }

    onError(error) {
        console.error(`${this.wsType} WebSocket error : `, error);
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            // console.log('Max reconnection attempts reached');
            return; // This return needs to be part of the if block
        }
        
        setTimeout(async () => {
            // console.log(`Attempt ${this.reconnectAttempts + 1} of ${this.maxReconnectAttempts} to reconnect`);
            this.reconnectAttempts++;
            try {
                await new Fetcher().refreshToken();
                await this.connect();
            } catch (error) {
                console.error('Reconnection attempt failed', error);
            }
        }, this.reconnectDelay);
    }

    sendMessage(type, payload = {}) {
        const data = {'type': type, 'payload': payload};
        
        // If not connected, queue the message and attempt reconnection
        if (!this.isConnected()) {
            console.warn(`WebSocket (${this.wsType}) not open. Queuing message and attempting to reconnect...`);
            this.messageQueue.push(data);
            this.attemptReconnect();
            return;
        }
        
        if (this.isRefreshingToken) {
            // console.log("Token refresh in progress, queuing message...");
            this.messageQueue.push(data);
            return;
        }
        
        try {
            // Double-check connection state before sending
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(data));
                // Add simple rate limiting - if sending lots of messages like paddle updates
                if (type === 'ball_update') {
                    // These types might be sent frequently - no need to log them
                } else {
                    console.log(`Sending ${this.wsType} message: ${type}`);
                }
            } else {
                console.error(`Failed sending ${this.wsType} data: socket not open`, data);
                this.messageQueue.push(data); // Queue for later sending
                this.attemptReconnect();
            }
        } catch (error) {
            console.error(`Failed sending ${this.wsType} data:`, error);
            this.messageQueue.push(data); // Queue for later sending
            this.attemptReconnect();
        }
    }

    subscribeMessageHandler(handler) {
        this.messageHandlers.add(handler);
    }

    unsubscribeMessageHandler(handler) {
        this.messageHandlers.delete(handler);
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    async waitForConnection() {
        if (!this.socket) {
            console.error('Error : websocket connection not established');
            this.attemptReconnect();
            return; // Add this to prevent the infinite loop
        }
        while (!this.isConnected()) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Add a more robust method to wait for connection with timeout
    async waitForConnectionWithTimeout(timeout) {
        if (!this.socket) {
            return false;
        }
        
        return Promise.race([
            new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.isConnected()) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 100);
            }),
            new Promise(resolve => {
                setTimeout(() => resolve(false), timeout);
            })
        ]);
    }

    // Process queued messages after reconnection
    processQueue() {
        if (this.messageQueue.length > 0) {
            console.log(`Processing ${this.messageQueue.length} queued messages for ${this.wsType}`);
            while (this.messageQueue.length > 0 && this.isConnected()) {
                const queuedMessage = this.messageQueue.shift();
                try {
                    this.socket.send(JSON.stringify(queuedMessage));
                } catch (error) {
                    console.error(`Error sending queued message for ${this.wsType}:`, error);
                    // Don't re-queue to avoid infinite loop
                }
            }
        }
    }
}