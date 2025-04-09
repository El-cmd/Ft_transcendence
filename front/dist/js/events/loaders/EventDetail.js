import { EventBasicLoader } from './EventBasicLoader.js';
import { EventFetcher } from '../EventFetcher.js';
import { EventDetail } from '../html_utils/EventDetail.js';
export class EventDetailLoader extends EventBasicLoader {
    constructor(params) {
        super('event_detail.html', params);

    }

    async fetchData() {
        console.log('fetching event detail data', this.params);
        const id = this.params.id.replace(':', '');
        const rsp = await  new EventFetcher().fetchEvent(id);
        const data = await rsp.json();
        if (data.type_str === 'tournament') {
            return  new EventFetcher().fetchEvent(id, 'tournaments');

        } else {
            return  new EventFetcher().fetchEvent(id, 'games');
        }
    }

    afterRender() {
        const data = this.data;
        const eventDetail = new EventDetail(data);
        const content = document.getElementById('main-content');
        content.innerHTML = '';
        
        content.appendChild(eventDetail.eventDetail);
        console.log('event detail data', this.data);
    }
}