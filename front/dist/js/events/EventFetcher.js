import { Fetcher } from "../fetchers/Fetcher.js";

export class EventFetcher extends Fetcher {
    
    constructor() {
        super();
        this.backBaseUrl = '/api/events';
    }

    async fetchEventsHistory() {
        return this.fetchData('/events/get_over_events/');
    }
    
    async fetchAccessibleEvents() {
        return this.fetchData('/events/get_accessible_events/');
    }   

    async fetchEvent(eventId, app_name = 'events') {
        return this.fetchData(`/${app_name}/${eventId}/`);
    }

    async doUnjoin(){
        return this.fetchDoAction('/events/unjoin/');
    }


    async fetchGamePlayers(eventId) {
        return this.fetchData('/events/current_game_player/');
    }

    

}

