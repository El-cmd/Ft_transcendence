import { EventBasicLoader } from "./EventBasicLoader.js";
import { AccessibleEventTable } from "../html_utils/EventTable.js";
import { EventFetcher } from "../EventFetcher.js";
import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";
import { router } from "../../Router.js";
import { eventWebSocket } from "../../services/EventWsManager.js";
export class AccessibleEventsLoader extends EventBasicLoader {
    constructor(params) {
        super('history.html', params);
        if (!eventWebSocket.players_status.join_authorized()) {
            HTMLUtils.redirect('/');
            return;
        }
    }

    async fetchData() {
        return new EventFetcher().fetchAccessibleEvents();
    } 


    async createGame() {
        console.log('Creating game');
        HTMLUtils.redirect('/event_create');
    }
    


    afterRender() {
        console.log('Data : ', this.data);
        if ( !!this.data['Error']) {
            console.log('Current event found, redirecting to hom');
            document.getElementById('main-content').innerHTML = '';
            HTMLUtils.redirect('/');
            return;
        }
        console.log('Data : ', this.data);
        if (!!this.data){
            if (this.data['inviteds'].length !== 0) {
                // add title to table
                console.log('Invited events found');
                const tableTitle = document.createElement('h2');
                tableTitle.textContent = 'Invited events';
                document.getElementById('eventTableContainer').appendChild(tableTitle);
                const event_table_inviteds = new AccessibleEventTable(this.data['inviteds']);
            } if (this.data['publics'].length !== 0) {
                // add title to table
                console.log('Public events found');
                const tableTitle = document.createElement('h2');
                tableTitle.textContent = 'Public events';
                document.getElementById('eventTableContainer').appendChild(tableTitle);
                const event_table_publics = new AccessibleEventTable(this.data['publics']);
            }
        }
        
        const buttonsRow = this.createButtons();
        document.body.appendChild(buttonsRow);
        document.getElementById('upperTableContainer').appendChild(buttonsRow);
    }



    createButtons() {
        const buttonsRow = document.createElement('div');
        buttonsRow.classList.add('button-back-container');
        // buttonsRow.classList.add('buttons-row');
        // buttonsRow.className = 'buttons-row';

        const createGameButton = document.createElement('button');
        createGameButton.innerText = 'Create Game';
        createGameButton.addEventListener('click', () => this.createGame());

        

        buttonsRow.appendChild(createGameButton);
        return buttonsRow;
    }
}