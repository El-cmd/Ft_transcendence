// import abstractView from "../abstractView.js";
import {abstractView} from '../../views/abstractView.js';

export class ChatDetails extends abstractView {
    constructor(params) {
        super('chat-detail.html', params);
        this.setTitle("Chat with <insert other's username>");
    }

}