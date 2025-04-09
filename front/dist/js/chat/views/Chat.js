import { abstractView } from "../../views/abstractView.js";
// import { getCurrentChatConnection } from "../../accounts/utils.js";

import { ChatFetcher } from "../fetchers/ChatFetcher.js";
/* 
These variables store references to specific parts of the HTML (identified by their id) 
    so JavaScript can dynamically manipulate them.
*/
// var conversationList = document.getElementById('conversationList');  // const ?
// var messagesContainer = document.getElementById('messages'); // const ?
// var messageInput = document.getElementById('messageInput'); // const ?
// var sendButton = document.getElementById('sendButton'); // const ?
// var chatWith = document.getElementById('chatWith'); // const ?

const chat_index_endpoint = '/api/chat/'; // passer par l'api_gateway

export class Chat extends abstractView {
    constructor(params) {
        super('chat.html', params);
        this.setTitle("Chat");
        this.activeConversationRecipient = null;
        this.activeConversationId = null;

        // this.connection = getCurrentChatConnection();
        // this.handleReceivedMessage = this.handleReceivedMessage.bind(this);
        this.handleSubmitMessage = this.handleSubmitMessage.bind(this);
        console.log("chat class constructor");
    }

    async getHtml() {
        // Load the chat HTML template
        const response = await fetch('/dist/partials/chat.html');
        console.log('Fetcher chat.html');
        return await response.text();
    }

    async afterRender() {
        // Get DOM elements
        const conversationList = document.getElementById("chat-conversations");
        const form = document.querySelector('#chat-form');
        console.log('after getting DOM elements in chat')

        try {
            await this.loadConversations(conversationList);
            // this.connection.susbcribe('private_message', this.handleReceivedMessage);

            // if (form) {
            //     // Remove any existing listeners
            //     const newForm = form.cloneNode(true);
            //     form.parentNode.replaceChild(newForm, form);
            //     // form.removeEventListener('submit', this.handleSubmitMessage);
                
            //     const boundHandler = this.handleSubmitMessage.bind(this);
            //     // Add the new listener
            //     newForm.addEventListener('submit', boundHandler); // this.handleSubmitMessage
                
            //     console.log('Message form event listener attached');
            // } else {
            //     console.error('Message form not found in DOM');
            // }
        }
        catch (error) {
            console.error('Error while loading chat : ', error);
            if (error.message.includes('WebSocket')) {
                console.error('WebSocket connection failed : ', error);
            } else {
                console.error('Failed to load the conversations : ', error);
                if (conversationList) {
                    conversationList.innerHTML = '<div class="error">Failed to load conversations. Please try again.</div>';
                }
            }
        }
    }

    async handleSubmitMessage(event) {
        event.preventDefault(); // Stops the default form submission, ie prevents the form from submitting traditionally (which would cause a page reload)
        event.stopPropagation(); // stops default event bubbling
        console.log('Message form submitted');
        if (!this.connection) {
            console.error(`No Chat WebSocket connection available for ${localStorage.getItem('username')}`)
            return;
        }

        // added from loginHandler
        // Disable form while processing
        // const form = event.target;
        // const submitButton = form.querySelector('button[type="submit"]');
        // submitButton.disabled = true;

        const inputField = document.querySelector('#chat-input-field');
        if (!inputField || !inputField.value.trim())
            return; // do not send empty messages
        if (!this.activeConversationRecipient) {
            console.error('No conversation selected');
            return;
        }

        const messageList = document.querySelector('#chat-messages');
        const message = inputField.value;
        console.log('Message list and message-to-be-sent fetched in DOM');
        try {
            console.log('Attempting to send message:', {
                from: localStorage.getItem('username'),
                to: this.activeConversationRecipient,
                message: message
            });

            // await this.connection.sendMessage({
            //     type: 'private_message',
            //     payload: {
            //         sender: localStorage.getItem('username'),
            //         recipient: this.activeConversationRecipient,
            //         message: message
            //     }
            // });
            inputField.value = '';
            if (messageList) {
                this.addMessage(message, messageList);
            }

            console.log('Message sent successfully:', {
                from: localStorage.getItem('username'),
                to: this.activeConversationRecipient,
                message: message
            });
        }
        catch (error) {
            console.error('Error while sending message : ', error);
            // const errorElement = document.querySelector('#login-error');
            // if (errorElement) {
            //     errorElement.textContent = 'An error occurred. Please try again.';
            //     errorElement.style.display = 'block';
            // }
        } 
        // finally {
            // // Re-enable form
            // submitButton.disabled = false;
        // }
    }

    async loadConversations(conversationList) {
        try {
            console.log("Loading conversations...");
            // const response = await this.authentifiedFetch('http://localhost:8000/chat/');
            const response = await new ChatFetcher().fetchChatHistory();
            
            if (!response.ok) {
                console.log(`Error fetching chat histoy for user ${localStorage.getItem('username')}`);
                throw new Error('Error fetching chat history');
            }
            console.log('Fetched chat history successfully');

            const conversations = await response.json();
            conversationList.innerHTML = ''; // Clear existing conversations

            console.log('Conversations : ', conversations);

            conversations.forEach(conversation => {
                const listItem = document.createElement("li");
                listItem.textContent = `Conversation with ${conversation.username}`;
                listItem.dataset.id = conversation.id;
                listItem.addEventListener("click", () => this.loadMessages(conversation.id, conversation.username));
                conversationList.appendChild(listItem);
                console.log('loaded chat history with ', conversation.username);
            });
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    async loadMessages(conversationId, otherUsername) {
        try {
            // const response = await this.authentifiedFetch(`http://localhost:8000/chat/${conversationId}/`);
            const response = await new ChatFetcher().fetchConversation(conversationId);
            if (!response.ok) {
                console.log(`Failed to fetch messages for conversation ${conversationId} with ${otherUsername}. Error ${response.status} : ${response.statusText}`)
                throw new Error('Error fetching messages');
            }
            const conversation = await response.json();
            console.log('Fetched conversation : ', conversation);

            const messages = conversation.messages;
            console.log('Messages : ', messages);

            // Update UI with messages
            const messageList = document.querySelector('#chat-messages');
            messageList.innerHTML = ''; // Clear existing messages

            if (!Array.isArray(messages)) {
                console.error('Messages is not an array:', messages);
                throw new Error('Messages data is not in the expected format'); 
            }
            messages.forEach(message => {
                this.addMessage(message.content, messageList); // tocheck : peut etre juste message et pas message.content car aussi besoin du sender + recipient + timestamp
            })
            this.setActiveConversation(conversationId, otherUsername);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    addMessage(text, messageList) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.textContent = text;
        messageList.appendChild(messageDiv);
        messageList.scrollTop = messageList.scrollHeight;
    }

    // callback function that will be called when new messages arrive through websocket connection
    // handleReceivedMessage(data) {
    //     const messageList = document.querySelector('#chat-messages');
    //     const payload = data.payload;
    //     console.log('Received message from ', payload.sender, ' : ', payload.content);
    //     if (data.type == 'private_message' && payload.sender == this.activeConversationRecipient) {
    //         this.addMessage(payload.content, messageList); // tocheck : idem que plus haut
    //     }
    // }

    setActiveConversation(convoId, otherUsername) {
        this.activeConversationRecipient = otherUsername;
        this.activeConversationId = convoId;
        console.log('Set activeConversation data : ', this.activeConversationRecipient, ' : ', this.activeConversationId);
    }

    // destroy() {
    //     if (this.connection) {
    //         this.connection.unsubscribe('private_message', this.handleReceivedMessage);
    //     }
    //     super.destroy();
    // }
}
