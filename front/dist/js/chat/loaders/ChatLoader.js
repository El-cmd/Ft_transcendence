import { ChatBasicLoader } from "./ChatBasicLoader.js";
import { ChatFetcher } from "../fetchers/ChatFetcher.js";
import { AccountFetcher } from "../../accounts/AccountFetcher.js";
import { Fetcher } from "../../fetchers/Fetcher.js";
import { ChatComponent } from "../html_utils/ChatHTMLElement.js";
import { chatWebSocket } from "../../services/ChatWsManager.js"
import { showToast } from "../../htmlutils/ToastNotifications.js";

import { router } from "../../Router.js";

/*
ChatBasicLoader methods : 
    getHtml : fetches html based on partialPath passed as constructor's parameter
    afterRender : dynamically injects the html into the DOM
    fetch, uses fetchData (override fetchData in subclasses) to fetch data from the server -> what's its use ?
    load : loads html content and calls the afterRender method
*/
export class ChatLoader extends ChatBasicLoader {
    constructor(params) {
        super('chat.html', params);
        console.log('ChatLoader constructor');

        this.state = {
            userInfos: null,
            currentConvo: null,
            currentConvoId: null, 
            conversations: [],
            convoMessages: [] 
        };

        this.handleMessage = this.handleMessage.bind(this);
        this.handleMessageSubmit = this.handleMessageSubmit.bind(this); // sendMessage

        // todo
        this.handleConversationSelect = this.handleConversationSelect.bind(this);
        this.handleUserSearch = this.handleUserSearch.bind(this);
        this.handleUserAction = this.handleUserAction.bind(this);

    }

    async load() {
        const response = await new AccountFetcher().fetchMyProfile();
        console.log('response : ', response);
        if (!response.ok) {
            console.error('ChatLoader : Failed to fetch logged-in user infos : ', response.status, ' : ', response.statusText);
        }
        this.state.userInfos = await response.json();
        console.log('In chat loader, user infos : ', this.state.userInfos);

        await super.load();

        // maybe : subscribe websocket to this.handleMessage here 
    }

    /*
    Called by BasicLoader::fetch(). Stores json response in this.response, and response's data in this.data
    */
    async fetchData() {
        console.log('Fetching chat history data');
        return new ChatFetcher().fetchChatHistory();
    }

    async afterRender() {
        console.log('Chat.afterRender(), data : ', this.data);
        const conversationList = document.getElementById('chat-conversation');
        // conversationList ? console.log('Found conversation-list in chat DOM') : console.log('Conversation-list not found in DOM');
        
        this.setupEventListeners();

        await this.loadChatIndex();

        // Setup UI components
        new ChatComponent().setupMessageForm(this.handleMessageSubmit);
        new ChatComponent().setupSearchBar(this.handleUserSearch);
                
        chatWebSocket.isConnected() ? console.log('Ws connected') : console.log('Ws not connected');
        chatWebSocket.subscribeMessageHandler(this.handleMessage);
    }

    setupEventListeners() {

        // conversationSelected if a custom event type, defined in ChatHTMLElement.js
        const conversationList = document.getElementById('chat-conversations');
        if (conversationList) {
            conversationList.addEventListener('conversationSelected', 
                (e) => this.handleConversationSelect(e.detail.conversationId));
        }

        // when clicking on the container of the user actions.
        // could set up event listeners for each action as well, one by one
        const userActions = document.getElementById('user-actions');
        if (userActions) {
            userActions.addEventListener('click', (e) => {
                const actionButton = e.target.closest('[data-action]');
                if (actionButton) {
                    const action = actionButton.dataset.action;
                    this.handleUserAction(action);
                }
            });
        }
    }

    async loadConversationList() {
        const response = await new ChatFetcher().fetchChatHistory();
        if (!response.ok) throw new Error('Failed to fetch conversations');
        
        this.state.conversations = await response.json();
        console.log('Updating conversation list sidebar. Fetched conversations : ', this.state.conversations);
        new ChatComponent().renderConversationList(this.state.conversations);
    }

    async loadChatIndex() {
        await this.loadConversationList();

        // Load first conversation if exists
        if (this.state.conversations.length > 0) {
            const lastConvoId = this.state.conversations[0].other_profile.id;
            await this.handleConversationSelect(lastConvoId);
        }
    }

    renderConversation(otherProfile, conversationHistory)
    {
        // Render the conversation Header
        new ChatComponent().renderConversationHeader(
            otherProfile,
            this.getAvailableActions(otherProfile)
        );
    
        // Render conversation messages
        new ChatComponent().renderMessages(
            conversationHistory ? conversationHistory.messages : null,
            this.state.userInfos.id
        );
    }

    async handleConversationSelect(conversationId) {
        try 
        {
            if (this.state?.currentConvoId == conversationId)
                return ;

            // Set as current conversation
            this.state.currentConvoId = conversationId;
            new ChatComponent().setActiveConversation(this.state.currentConvoId);

            // Reload conversations list in the sidebar to remove potentially empty conversations
            await this.loadConversationList();

            // Fetch conversation history
            await this.fetchCurrentConversation();
            const conversation = this.state.currentConvo;
            const otherProfile = this.state.currentConvo.other_profile;

            this.renderConversation(otherProfile, conversation);
        }
        catch (error) {
            console.error('Error selecting conversation:', error);
        }
    }

    async startNewConversation(otherUserId) {
        // Check if conversation already exists -> if so, call this.handleConversationSelect()
        if (document.querySelector(`.conversation-item[data-conversation-id="${otherUserId}"]`))
        {
            this.handleConversationSelect(otherUserId);
            return;
        }

        // Set as current conversation
        this.state.currentConvoId = otherUserId;
        new ChatComponent().setActiveConversation(this.state.currentConvoId);

        // Reload conversations list in the sidebar to remove potentially empty conversations
        await this.loadConversationList();

        // Fetch the other user's profile data
        const response = await new AccountFetcher().fetchProfile(otherUserId);
        if (!response.ok) throw new Error('Failed to fetch profile : ', response.status);
        const otherProfile = await response.json();
        
        // Add new conversation data to this.state.conversations (has to do this by hand, as the conversation does not exist in the chat db yet, as no messages have been exchanged for now)
        const newConversation = {other_profile : {id : otherProfile.id, username : otherProfile.username, avatar : otherProfile.avatar}, last_message : null, unread_count: 0};
        console.log('Adding conversation : ', newConversation, ' to existing conversations : ', this.state.conversations);
        this.state.conversations.unshift(newConversation); // adding new convo at the top of the conversations list (bc most recent)
        
        this.state.currentConvo = newConversation; // check si casse pas tout 

        // Render conversation list
        new ChatComponent().renderConversationList(this.state.conversations);

        this.renderConversation(otherProfile, null);
    }

    async fetchCurrentConversation() {
        if (!this.state.currentConvoId)
            throw new Error('Cannot load conversation : none is selected (currentConvoId is null)');
        try {
            const response = await new ChatFetcher().fetchConversation(this.state.currentConvoId);
            if (!response.ok) {
                console.log(`Failed to fetch messages for conversation ${this.state.currentConvoId}. Error ${response.status} : ${response.statusText}`)
                throw new Error('Error fetching messages');
            }

            this.state.currentConvo = await response.json();
            console.log('Fetched conversation : ', this.state.currentConvo);

            this.state.convoMessages = this.state.currentConvo.messages;
            if (!Array.isArray(this.state.convoMessages)) {
                console.error('Messages from conversation ' + this.state.currentConvoId + ' is not an array:', this.state.convoMessages);
                throw new Error('Messages data is not in the expected format'); 
            }

            console.log('In fetchCurrentConversation, currentConvoId = ', this.state.currentConvoId, '. current conversation = ', this.state.currentConvo);

        } catch (error) {
            console.error('Failed fetching conversation ' + this.state.currentConvoId + ' :' + error);
        }
    }

    getAvailableActions(otherUser) {
        const actions = [
            { type: 'view-profile', label: 'Profile' }
        ];

        for (const [action, url] of Object.entries(otherUser.actions)) {
            console.log('currently parsed action : ', action, '. Label : ', action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' '));
            actions.push({ type: action, label: action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ') });
        }

        if (actions.some(action => action.type === 'block')) {
            actions.push({ type: 'invite-game', label: 'Invite to Game' });
        }

        console.log('Possible actions against ', otherUser, ' : ', actions);

        return actions;
    }

    async isOtherBlocked(otherId) {
        const response = await new AccountFetcher().fetchRelation('blockeds');
        if (!response.ok) throw new Error('Failed to fetch blocked users : ' + response.status);
        const blockedUsers = await response.json();
        
        return blockedUsers.find(user => user.id === otherId);
    }

    async handleMessageSubmit(message, messageType = 'text') {
        if (!this.state.currentConvoId) return; // ou currentConvo ? 

        if (await this.isOtherBlocked(this.state.currentConvoId)) {
            console.log('Cannot send msg to that user : must unblock them before that');
            showToast("You need to unblock this user to send a message.", "danger");
            return;
        }

        try {
            const sender = this.state.userInfos.id;
            const recipient = this.state.currentConvoId;
            const payload = {
                'sender': sender,
                'recipient': recipient,
                'content': message,
                'timestamp': new Date().toISOString(), // voir si cree timestamp ici ou qd cree le msg dans la db
                'message_type': messageType
            }
            console.log(`${this.state.userInfos.username} sending message to ${this.state.currentConvoId} : ${message}`)
            chatWebSocket.sendMessage('private_message', payload);
            
            // Add message to UI
            new ChatComponent().addMessage(payload, this.state.userInfos.id);
            
            // await this.loadConversationList(); // msg not created rapidly enough in the chat database, and reloading the conversation list does therefore not put the current convo at the top of the list... -> tant pissss faudra etre un peu patient.e
            new ChatComponent().updateConvoLastMessage(this.state.currentConvo, payload);
            
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async handleUserSearch(searchTerm) {
        try {
            const response = await new AccountFetcher().fetchSearchedUsers(searchTerm);
            if (!response.ok) {
                throw new Error('Failed to search users');
            }
            const users = await response.json();
            console.log('Search results for ' + searchTerm + ' : Users found : ', users);

            
            const results = document.getElementById('searchResults');
            results.innerHTML = ''; // ?
            
            results.innerHTML = users
                .map(user => `
                    <div class="search-result-item p-2" data-user-id="${user.id}">
                        <img src="${user.avatar}" class="rounded-circle me-2" width="24" height="24" alt="">
                        <span>${user.username}</span>
                    </div>
                `)
                .join('');
                
            // Add click handlers for search results
            // a modifier : cree une nouvelle conv a chaque fois, alors que doit check si elle existe deja. si oui, redirige dessus
            results.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', async () => {
                    results.innerHTML = ''; // hides the search results
                    await this.startNewConversation(item.dataset.userId)
                });
            });
            
        } catch (error) {
            console.error('Error searching users:', error);
            results.innerHTML = '<div class="search-error">Error searching for users</div>';
        }
    }


    /**
     * Create new game. 
     * Send game's id to the back. That way, invited user's consumer will fetch the game infos, send them back to the 
     * client, which will display a 'join' button in the chat, which, when clicked, redirects to the game page.
     */
    async handleGameInviting() {
        console.log('in handleGameInviting');
        const rsp = await new Fetcher().fetchData('/api/events/events/invite/' +this.state.currentConvo.other_profile.id + '/');

        // send the invite through ws, to save it in the database
        this.handleMessageSubmit('Game invite', 'game_invite');

    }

    async handleProfileAction(action) {
        const urlBackBase = '/api/accounts/profiles/update_relation/' + action + '/' + this.state.currentConvo.other_profile.id;
        console.log('in chat : action', urlBackBase);
        const response = await new Fetcher().fetchData(urlBackBase);
        if (!response.ok) throw new Error('Failed to perform profile action : ', action);

        const rsp = await new AccountFetcher().fetchProfile(this.state.currentConvo.other_profile.id);
        if (!rsp.ok) throw new Error('Failed to fetch profile');
        const other_profile = await rsp.json(); // a check !

        // update UI (if blocked user, now show 'unblock' instead of 'block')
        // new ChatComponent().updateActionsContainer(this.getAvailableActions(other_profile));
        new ChatComponent().renderConversationHeader(other_profile, this.getAvailableActions(other_profile)); // render the whole header, in case the online status needs to be added/removed (if friend/unfriend)
        new ChatComponent().renderSidebarOnlineStatus(other_profile); // render only the conversation item, in case the online status needs to be added/removed (if online)

        chatWebSocket.sendMessage('relation_update', {sender: this.state.userInfos.id, target: this.state.currentConvo.other_profile.id, action: action});
    }

    async viewProfile() {
        if (!this.state.currentConvoId) {
            console.log('No conversation selected, cannot view other user\'s profile');
            return ;
        }
        window.location.hash = `#/profiles/:${this.state.currentConvo.other_profile.id}`;
    }
    
    async handleUserAction(action) {
        if (!this.state.currentConvo) return;
        
        try {
            const userId = this.state.currentConvo.other_profile.id;
            switch (action) {
                case 'block':
                    // Implement blocking user logic
                    console.log(`${this.state.userInfos.username} blocking ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
                case 'unblock':
                    // Implement unblocking user logic
                    console.log(`${this.state.userInfos.username} unblocking ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
                case 'invite-game':
                    // Implement game invitation logic
                    console.log(`${this.state.userInfos.username} inviting ${this.state.currentConvo.other_profile.username} to a game`);
                    this.handleGameInviting();
                    break;
                case 'view-profile':
                    // Implement profile view logic
                    console.log(`${this.state.userInfos.username} viewing ${this.state.currentConvo.other_profile.username} profile`);
                    this.viewProfile();
                    break;
                case 'create_request':
                    // Implement creating friend request logic
                    console.log(`${this.state.userInfos.username} sending friend request to ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
                case 'accept_friend':
                    // Implement accepting friend request logic
                    console.log(`${this.state.userInfos.username} accepting friend request from ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
                case 'delete_request':
                    // Implement deleting friend request logic
                    console.log(`${this.state.userInfos.username} deleting friend request to ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
                case 'unfriend':
                    // Implement unfriending user logic
                    console.log(`${this.state.userInfos.username} unfriending ${this.state.currentConvo.other_profile.username}`);
                    this.handleProfileAction(action); 
                    break;
            }
            
            // Refresh conversation to update available actions
            await this.handleConversationSelect(this.state.currentConvoId);
            
        } catch (error) {
            console.error('Error handling user action:', error);
        }
    }

    async handleMessage(data) {
        console.log('in handleMessage (received a ws message), data : ', data);
        console.log('current convo id : ', this.state.currentConvoId);

        if (data.type == 'private_message') {
            if (!this.state.currentConvoId) {
                console.log('Message received : ', data.payload.content, '. No active convo yet, switching to this one.')
                // this.handleConversationSelect(data.payload.sender); ?
                this.loadChatIndex();
            }
            else {
                if (data.payload.sender == this.state.currentConvoId) 
                    new ChatComponent().addMessage(data.payload, this.state.userInfos.id);
                await this.loadConversationList(); // updates conversation list sidebar to put new msg's convo at the top 
            
            } 
        } 
        else { // 'relation_update' or 'status_update'
            const response = await new AccountFetcher().fetchProfile(data.payload.sender);
            if (!response.ok) throw new Error('Failed to fetch profile : ', response.status);
            const other_profile = await response.json();

            if (data.payload.sender == this.state.currentConvoId)
                new ChatComponent().renderConversationHeader(other_profile, this.getAvailableActions(other_profile));
            new ChatComponent().renderSidebarOnlineStatus(other_profile);
        }
    }

    destroy() {
        chatWebSocket.unsubscribeMessageHandler(this.handleMessage);
        // chatWebSocket.disconnect(1000); 
        // super.destroy();
    }
}