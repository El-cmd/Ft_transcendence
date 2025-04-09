import { BasicLoader } from "../../loaders/BasicLoader.js";

export class EventBasicLoader extends BasicLoader {
    constructor(partialPath, params) {
        super('events/' + partialPath, params);
    }
} 