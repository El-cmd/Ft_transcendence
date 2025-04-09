import { Fetcher } from "../../fetchers/Fetcher.js";

export class ChatFetcher extends Fetcher {

    constructor() {
        super();
        /*
        Frontend makes request to /api/chat/...
        API gateway receives request at /api/chat location block
        API gateway proxies request to http://chat_managment:8003
        Chat service processes the request and returns JSON response
        */
        this.backBaseUrl = '/api/chat';
    }

    async fetchChatHistory() {
        return this.fetchData('');
    }

    async fetchConversation(convoId) {
        return this.fetchData(`${convoId}`);
    }

}