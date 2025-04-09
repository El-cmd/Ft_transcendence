import { BasicLoader } from './../../loaders/BasicLoader.js';

export class ChatBasicLoader extends BasicLoader {
    constructor(partialPath, params) {
        super('chat/' + partialPath, params);
    }
}