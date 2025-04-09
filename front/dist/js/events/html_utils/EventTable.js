import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";
import { EventHTMLUtils } from './EventHTMLUtils.js';
import { formatTimestamp } from "../../chat/html_utils/ChatHTMLElement.js";

class EventRow extends EventHTMLUtils {

    constructor(event) {
        super(event);
        this.event = event;
        console.log('event', event);
        this.container = document.createElement('tr');
        this.container.onclick = this.eventRef;

        const lambdas = this.generateEventLambdaList();

        for (let lambda of lambdas) {
            this.container.appendChild(this.createLambdaIntoTd(lambda));
        }

    }

    generateEventLambdaList() {
        const lambdas = this.baseLambdas();
        return lambdas;
    }

    baseLambdas() {
        const lambdas = [];
        lambdas.push(() => { return document.createTextNode(this.event.type_str); });
        lambdas.push(() => { return this.createLambdaIntoTd(this.eventRef); });
        // lambdas.push(() => { return document.createTextNode(this.event.is_public ? 'public' : 'private'); });
        // lambdas.push(() => {
        //     const description = this.event.description.length > 30 ? this.event.description.slice(0, 30) + '...' : this.event.description;
        //     return document.createTextNode(description);
        // });
        lambdas.push(() => {
            return this.createUserList(this.event.players);
        });
        return lambdas;
    }

    createUserList(user_list) {

        const usersContainer = document.createElement('div');
        const maxPlayersToShow = 2;
        let usersShown = 0;
        console.log('user_list', user_list);
        if (!user_list) {}
        for (let user of user_list) {
            if (usersShown >= maxPlayersToShow) {
                const morePlayersElement = document.createElement('p');
                morePlayersElement.textContent = '...';
                usersContainer.appendChild(morePlayersElement);
                break;
            }
            const userElement = document.createElement('p');
            userElement.textContent = user.userevent_name;
            userElement.onclick = () => {
                HTMLUtils.redirect(`#/profiles/:${user.user}`);
                return false;
            }
            usersContainer.appendChild(userElement);
            usersShown++;
        }
        return usersContainer;
    }

    get eventRow() {
        return this.container;
    }
}


export class OverEventRow extends EventRow {

    generateEventLambdaList() {
        const lambdas = this.baseLambdas();

        if (!!this.event.user_rank) {
            lambdas.push(() => { return document.createTextNode(this.event.user_rank); });
        } else {
            lambdas.push(() => { return document.createTextNode('x'); });
        }
        lambdas.push(() => { return document.createTextNode(this.event.max_players); });

        lambdas.push(() => { return document.createTextNode(formatTimestamp(this.event.end_date)); });
        // lambdas.push(() => { return document.createTextNode(this.event.time_since_end); });
        // lambdas.push(() => { return document.createTextNode(new Date(this.event.time_since_end * 1000).toISOString().slice(11, 19)); }); // this.event.time_since_end
        return lambdas;
    }
}

export class AccessibleEventRow extends EventRow {
    generateEventLambdaList() {
        const lambdas = this.baseLambdas();
        if (!this.event.inviteds) {
            this.event.inviteds = [];
        }
        lambdas.push(() => { return this.createUserList(this.event.inviteds); });
        lambdas.push(() => { return document.createTextNode(this.event.max_players); });
        lambdas.push(() => { return this.createActionButtons('td'); });
        return lambdas;
    }
}

class EventTable extends EventHTMLUtils {
    constructor(events, rowType) {
        super();
        this.events = events
        this.upperContainer();
        if (!this.events || this.events.length === 0) {
            return;
        }
        this.container = document.createElement('table');
        this.container.id = 'eventTable';
        // document.getElementById('eventTable');
        this.container.innerHTML = '';
        this.init_thead();
        this.rowType = rowType;
        this.init_body();
        document.getElementById('eventTableContainer').appendChild(this.container);
    }

    upperContainer() {
        const upperTableContainer = document.getElementById('upperTableContainer');
        const titleElement = document.createElement('h1');
        titleElement.textContent = this.title();
        upperTableContainer.appendChild(titleElement);
        return upperTableContainer;
    }

    init_thead() {
        const thead = document.createElement('thead');
        const theadRow = document.createElement('tr');
        const lambdas = this.thead_lambdas();
        this.createLamdbasIntoContainer(theadRow, lambdas, 'th');
        thead.appendChild(theadRow);
        this.container.appendChild(thead);
    }

    get eventTable() {
        return this.container;
    }
    init_body() {
        if (!this.events || this.events.length === 0) {
            return;
        }
        const tbody = document.createElement('tbody');
        
        for (let event of this.events) {
            const eventRow = new this.rowType(event);
            tbody.appendChild(eventRow.eventRow);
        }
        this.container.appendChild(tbody);
    }
}

export class OverEventTable extends EventTable {
    constructor(events) {
        super(events, OverEventRow);
    }

    title() {
        return 'Historique des evenement!';
    }

    thead_lambdas() {
        const lambdas = [];
        lambdas.push(() => { return document.createTextNode('Type'); });
        lambdas.push(() => { return document.createTextNode('Name'); });
        // lambdas.push(() => { return document.createTextNode('Public'); });
        // lambdas.push(() => { return document.createTextNode('Description'); });
        lambdas.push(() => { return document.createTextNode('Players'); });
        lambdas.push(() => { return document.createTextNode('User rank'); });
        lambdas.push(() => { return document.createTextNode('Players count'); });
        lambdas.push(() => { return document.createTextNode('End Date'); });
        return lambdas;
    }

}

export class AccessibleEventTable extends EventTable {
    constructor(events) {
        console.error('events', events);
        super(events, AccessibleEventRow);
        
    }

    title() {
        return 'Evenements accessibles';
    }

  

    thead_lambdas() {
        const lambdas = [];
        lambdas.push(() => { return document.createTextNode('Type'); });
        lambdas.push(() => { return document.createTextNode('Name'); });
        lambdas.push(() => { return document.createTextNode('Players'); });
        lambdas.push(() => { return document.createTextNode('Inviteds'); });
        lambdas.push(() => { return document.createTextNode('Max players'); });
        lambdas.push(() => { return document.createTextNode('Actions'); });
        return lambdas;
    }


}