import { AccountFetcher } from "../accounts/AccountFetcher.js";
import { showToast } from "../htmlutils/ToastNotifications.js"

export class MessageNotificationHandler {
    constructor() {
        this.handleMessage = this.handleMessage.bind(this);
    }

    async handleMessage(data) { // data is already the return of a JSON.parse() call
        console.log('in MessageNotificationHandler::handleMessage, data : ', data);

        const payload = data.payload;
        const response = await new AccountFetcher().fetchProfile(payload.sender);
        if (!response.ok) throw new Error('Error fetching profile of user ', payload.sender);
        const profile = await response.json();

        if (!window.location.hash.includes('/chat') && data.type == 'private_message') {
            if (payload.message_type == 'text')
                showToast(`New message from ${profile.username}: ${payload.content}`, "success");
            else if (payload.message_type == 'game_invite')
                showToast(`${profile.username} invited you to a game`, "success");
        }
        else if (data.type == 'status_update') 
        {
            // todo : check if user is on a page that displays their friends' online statuses 
            // -> if so, and is the message type is 'status_update', update the UI accordingly 
            if (!window.location.hash.includes('/chat') )
            showToast(`${profile.username} is now ${payload.status}`, "success");
        }
        else if (data.type == 'game_invite') // && !window.location.hash.includes('/chat') 
            showToast(`${profile.username} invited you to a game`, "success");
    }
}

export const globalMessageHandler = new MessageNotificationHandler();