import { EventBasicLoader } from "./EventBasicLoader.js";
import { EventFetcher } from "../EventFetcher.js";
import { OverEventTable } from "../html_utils/EventTable.js";
export class EventHistoryLoader extends EventBasicLoader {
    constructor(params) {
        super('history.html', params);   
    }

    async fetchData() {
        return new EventFetcher().fetchEventsHistory();
    }

    afterRender() {
        const event_table = new OverEventTable(this.data);

    }
}