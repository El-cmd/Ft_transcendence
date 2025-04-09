
/* 
What we need : 
A websocket that will only be created once -> is this.instance exists, return it. else, create websocket.
A way to keep track of callback methods (subscribe, unsubscribe) -> whenever .onmessage returns (ie receives a message
    through the websocket connection, these callback methods will be called).
    A "callback" is simply a function that will be called when something specific happens. 
    In the context of WebSocket messages, these are functions that we want to execute whenever a new message arrives.
A destructor (close websocket connection when the service is destroyed, or the other way around ?)
    -> The singleton is not freed until the termination of the program.
        -> meaning, when the program ends, and the service is destroyed, close the websocket connection 
*/
export class WebSocketService {

    constructor() {
        if (WebSocketService.instance) // since is a singleton, should work properly, right ?
            return WebSocketService.instance;
        this.messageCallbacks = [];
        this.socket = null;
        WebSocketService.instance = this;
    }

    connect() {
        // connects websocket to chat endpoint
        if (!this.socket) { // || this.socket.readyState === WebSocket.CLOSED ? is there a case where this would be true ?
            
            this.socket = new WebSocket("ws://localhost:800000/ws/chat/");

            this.socket.onopen = () => {
                console.log('Chat WebSocket connection established');
            };

            // listen for incoming server-side messages (.onmessage())
            // when  that happens, broadcast the message to all subscribed callback methods 
            this.socket.onmessage = (event => {
                console.log('Broadcasting ', event.data, ' to chat\'s message callback methods');
                const msg = JSON.parse(event.data);
                this.messageCallbacks.forEach(callback => callback(msg)); 
            });

            // listen for potential server-side disconnection (.onclose())
            this.socket.onclose = () => {
                console.log('Chat WebSocket connection closed');
            };

            this.socket.onerror = (error) => {
                console.error('Chat WebSocket error:', error);
            };
        }

        // return this.socket(); ? why  
    }

    // add a callback method
    subscribe(callback) {
        console.log('Adding message callback method : ', callback);
        this.messageCallbacks.push(callback);
    }

    // remove a callback method
    unsubscribe(callback) {
        console.log('Removing message callback method : ', callback);
        this.messageCallbacks.pop(callback);
    }

    // sendMessage()

    destroy() {
        /*
        It may be helpful to examine the socket's bufferedAmount attribute before attempting 
        to close the connection to determine if any data has yet to be transmitted on the network. 
        If this value isn't 0, there's pending data still, so you may wish to wait before closing the connection.
        */
        if (this.socket.readyState !== (WebSocket.CLOSED || WebSocket.CLOSING)) // ca marche comme syntaxe ? 
            this.socket.close();
        this.messageCallbacks.forEach(callback => this.unsubscribe(callback)); // ?
        WebSocketService.instance = null;
    }


}

const chatWebSocketService = new WebSocketService(); // is this the right way to declare a singleton ? 