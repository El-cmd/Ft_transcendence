import { EventBasicLoader } from "./EventBasicLoader.js";
import { EventFetcher } from "../EventFetcher.js";
import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";
import { router } from "../../Router.js";

export class EventCreateLoader extends EventBasicLoader {
    constructor(params) {
        super('event_create.html', params);   
    }

    showEventModal() {
        console.log("showEventModal() a été appelée !");
        const modalElement = document.getElementById("createEventModal");

        const eventTypeSelect = document.getElementById('eventType');
        const maxPlayersSelect = document.getElementById('maxPlayers');

        eventTypeSelect.addEventListener('change', () => {
            const eventType = eventTypeSelect.value;
            let optionsHtml = '';

            if (eventType === 'game') {
                optionsHtml = `
                    <option value="2">2</option>
                    <option value="4">4</option>
                `;
            } else if (eventType === 'tournament') {
                optionsHtml = `
                    <option value="4">4</option>
                    <option value="8">8</option>
                `;
            }

            maxPlayersSelect.innerHTML = optionsHtml;
        });

        modalElement.addEventListener('submit', (event) => { this.createEvent(event) });

        if (modalElement) {
            const eventModal = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
            eventModal.show();

            // Add event listener for modal close
            modalElement.addEventListener('hidden.bs.modal', () => {
                console.log('Modal closed, redirecting to home');
                if (router.currentLoader === EventCreateLoader) {
                    window.history.back();
                }
            });
        } else {
            console.log("La modale de connexion n'a pas été trouvée !");
        }
    }

    hideModal() {
        const modalElement = document.getElementById('createEventModal');
        if (modalElement) {
            const eventModal = bootstrap.Modal.getInstance(modalElement);
            eventModal.hide();
        }
    }

    afterRender() {
        console.log('In EventCreateLoader afterRender');
        this.showEventModal();
    }

    async createEvent(event) {
        event.preventDefault();
        const form = document.getElementById('eventCreateForm');
        const formData = new FormData(form);

        const eventDetails = {
            type: formData.get('eventType'),
            name: formData.get('eventName'),
            description: formData.get('eventDescription'),
            is_public: formData.get('eventVisibility') === 'on', // Convert to boolean
            max_players: formData.get('maxPlayers'),
            score_to_win: formData.get('scoreToWin')
        };

        console.log('Event Created:', eventDetails);
        let create_url = '';
        if (eventDetails.type === 'game') {
            console.log('Game event created');
            create_url = 'games/';
        } else {
            console.log('Tournament event created');
            create_url = 'tournaments/';
        }
        
        const response = await new EventFetcher().doPostFetch(create_url, eventDetails);
        console.log('Response:', response);
        this.hideModal();
    }
    
    destroy() {
        console.log('In EventCreateLoader destroy');
        this.hideModal();
    }
}