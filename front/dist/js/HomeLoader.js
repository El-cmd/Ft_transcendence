import { HTMLUtils } from "./htmlutils/HTMLUtils.js";
import { BasicLoader } from "./loaders/BasicLoader.js";
import { Fetcher } from "./fetchers/Fetcher.js";
import { EventFetcher } from "./events/EventFetcher.js";
import { router } from "./Router.js";
import { eventWebSocket } from "./services/EventWsManager.js";

export class HomeLoader extends BasicLoader {
    constructor(params) {
        super('home.html', params);
        
        
    }

    async fetchData() {
        return await new Fetcher().fetchCurrent();
    }

    // local games buttons
    addSoloButton() {
        const soloButton = document.createElement('button');
        soloButton.textContent = 'Solo';
        soloButton.addEventListener('click', () => {
            HTMLUtils.redirect('#/local_game/:solo');
        });
        this.homeButtonsContainer.appendChild(soloButton);
    }

    addLocalDuoButton() {
        const soloButton = document.createElement('button');
        soloButton.textContent = 'Duo';
        soloButton.addEventListener('click', () => {
            HTMLUtils.redirect('#/local_game/:duo');
        });
        this.homeButtonsContainer.appendChild(soloButton);
    }

    addLocalSquadButton() {
        const squadButton = document.createElement('button');
        squadButton.textContent = 'Squad';
        squadButton.addEventListener('click', async () => {
            HTMLUtils.redirect('#/local_game/:multi');
        });
        this.homeButtonsContainer.appendChild(squadButton);
    }

    // online games buttons
    addDuoButton() {
        const duoButton = document.createElement('button');
        duoButton.textContent = 'Duo';
        duoButton.addEventListener('click', async  () => {
            await new EventFetcher().fetchData('games/create_default_game2/')
            router.rerenderCurrentRoute();
            // HTMLUtils.redirect('/#/');
            return;
        });
        this.homeButtonsContainer.appendChild(duoButton);
    }

    addSquadButton() {
        const squadButton = document.createElement('button');
        squadButton.textContent = 'Squad';
        squadButton.addEventListener('click', async  () => {
            new EventFetcher().fetchData('games/create_default_game4/')
            HTMLUtils.redirect('/'); // ln
            return;
        });
        this.homeButtonsContainer.appendChild(squadButton);
    }

    addCreateButton() {
        const createButton = document.createElement('button');
        createButton.textContent = 'Create';
        createButton.addEventListener('click', () => {
            HTMLUtils.redirect('#/event_create');
            return;
        });
        this.homeButtonsContainer.appendChild(createButton);
    }

    addJoinExistingButton() {
        const joinExistingButton = document.createElement('button');
        joinExistingButton.textContent = 'Join existing';
        joinExistingButton.addEventListener('click', () => {
            HTMLUtils.redirect('#/accessible-events');
            return;
        });
        this.homeButtonsContainer.appendChild(joinExistingButton);
    }

    addJoinAnyButton() {
        const joinAnyButton = document.createElement('button');
        joinAnyButton.innerText = 'Join Any Game';
        joinAnyButton.addEventListener('click', async () => {
            console.log('Joining game');
            const response = await new EventFetcher().fetchDoAction('games/join_any_public/')
            // router.rerenderCurrentRoute();
            HTMLUtils.redirect('/');
            console.log('Response : ', response);
            return;
        });
        this.homeButtonsContainer.appendChild(joinAnyButton);
    }

    // main buttons
    addLocalLinkButton() {
        const localButton = document.createElement('button');
        localButton.textContent = 'Local';
        localButton.addEventListener('click', () => {
            HTMLUtils.redirect('/local_menu');
        });
        this.homeButtonsContainer.appendChild(localButton);
    }

    addOnlineLinkButton() {
        const onlineButton = document.createElement('button');
        onlineButton.textContent = 'Online';
        onlineButton.addEventListener('click', () => {
            HTMLUtils.redirect('/online_menu');
        });
        this.homeButtonsContainer.appendChild(onlineButton);
    }

    async unjoinEvent() {
        
        // await new EventFetcher().doUnjoin();

        // eventWebSocket.sendMessage('quit');
        await new EventFetcher().fetchData('events/unjoin');
        router.rerenderCurrentRoute();
    }

    addUnjoinButton() {
        const unjoinButton = document.createElement('button');
        unjoinButton.textContent = 'Unjoin';
        unjoinButton.addEventListener('click', this.unjoinEvent);
        unjoinButton.classList.add('btn', 'btn-danger', 'event-button'); // Ajout de event-button
        this.homeButtonsContainer.appendChild(unjoinButton);
    }

    addInviteButton() {
        const inviteButton = document.createElement('button');
        inviteButton.textContent = 'Invite';
        inviteButton.classList.add('event-button'); // Ajout de event-button
        inviteButton.addEventListener('click', () => {
            HTMLUtils.redirect('/relation/:friends');
        });
        this.homeButtonsContainer.appendChild(inviteButton);
    }

    addEventPageButton() {
        if (eventWebSocket.players_status.game_status !== 'None' && eventWebSocket.players_status.current_game_id != null) {
            const eventPageButton = document.createElement('button');
            eventPageButton.textContent = 'Game Page';
            eventPageButton.classList.add('event-button'); // Ajout de event-button
            eventPageButton.addEventListener('click', () => {
                HTMLUtils.redirect('/event/:' + eventWebSocket.players_status.current_game_id);
                return;
            });
            this.homeButtonsContainer.appendChild(eventPageButton);
        } if (eventWebSocket.players_status.tournament_status !== 'None' && eventWebSocket.players_status.current_game_id != null) {
            const eventPageButton = document.createElement('button');
            eventPageButton.textContent = 'Tournament Page';
            eventPageButton.classList.add('event-button'); // Ajout de event-button
            eventPageButton.addEventListener('click', () => {
                console.log('eventWebSocket.players_status', eventWebSocket.players_status);
                HTMLUtils.redirect('/event/:' + eventWebSocket.players_status.current_tournament_id);
                return;
            });
            this.homeButtonsContainer.appendChild(eventPageButton);
        }
    }

    createReadyButton() {
        // Move the input to the username container at the top
        const usernameContainer = document.getElementById('username-input-container');
        usernameContainer.style.display = 'block'; // Make it visible
        
        // Clear previous content if any
        usernameContainer.innerHTML = '';
        
        // Get current username as default value
        const currentUsername = localStorage.getItem('current_username') || '';
        
        // Create the input field
        const customNameInput = document.createElement('input');
        customNameInput.type = 'text';
        customNameInput.placeholder = 'Entrez un pseudo pour le tournoi';
        customNameInput.value = currentUsername;
        customNameInput.id = 'custom-tournament-name';
        customNameInput.style.width = '100%';
        customNameInput.style.padding = '8px';
        customNameInput.style.marginBottom = '15px';
        customNameInput.style.textAlign = 'center';
        
        // Add the input to the username container
        usernameContainer.appendChild(customNameInput);
        
        // Create standalone ready button (matching other buttons' style)
        const readyButton = document.createElement('button');
        readyButton.textContent = 'Ready';
        
        readyButton.addEventListener('click', async () => {
            // Get the custom name (use current name if empty)
            const customName = document.getElementById('custom-tournament-name').value.trim() || currentUsername;
            console.log('Using custom name:', customName);
            
            try {
                const rsp = await new EventFetcher().fetchData('events/player_ready/' + encodeURIComponent(customName));
                console.log('Ready response:', rsp);
                
                if (rsp.ok) {
                    const data = await rsp.json();
                    console.log('Ready data:', data);
                    
                    // Store temporary username for this event
                    sessionStorage.setItem('event_username', customName);
                    
                    if (!data.launched) {
                        router.rerenderCurrentRoute();
                    }
                } else {
                    console.error('Échec de l\'envoi du pseudo personnalisé');
                }
            } catch (error) {
                console.error('Erreur lors de l\'envoi du pseudo:', error);
            }
        });
        
        // Add the button directly to the buttons container to match other buttons
        this.homeButtonsContainer.appendChild(readyButton);
    }

    addLocalButtons() {
        this.addSoloButton();
        this.addLocalDuoButton();
        this.addLocalSquadButton();
    }

    addJoinOnlineButtons() {
        const gameSelection = document.querySelector('.game-selection');
        gameSelection.classList.add('online');
        
        this.addDuoButton();
        this.addSquadButton();
        this.addJoinAnyButton();
        this.addJoinExistingButton();
        this.addCreateButton();
    }

    addBaseButtons() {
        this.addOnlineLinkButton();
        this.addLocalLinkButton();
    }

    renderNoCurrent() {
        console.log('HomeLoader.renderNoCurrent');
        if (window.location.href.includes('local_menu')) {
            console.log('local menu');
            this.title.innerHTML = 'Choose local mode';
            this.addLocalButtons();
        } else if (window.location.href.includes('online_menu')) {
            this.title.innerHTML = 'Choose online mode';
            console.log('online menu');
            this.addJoinOnlineButtons();
        } else {
            this.title.innerHTML = 'Choose a mode';
            this.addBaseButtons();
        }
    }

    afterRender(){
        this.homeMainContainer = document.getElementById('home-game-container');
        this.titleContainer = document.getElementById('home-title');
        this.title = document.createElement('h1');
        this.homeButtonsContainer = document.getElementById('home-buttons');
        const usernameContainer = document.getElementById('username-input-container');
        usernameContainer.style.display = 'none'; // Masquer par défaut
        
        console.log('home loader data', this.data)

        if (eventWebSocket.players_status.game_status === 'None' && eventWebSocket.players_status.tournament_status === 'None') {
            this.renderNoCurrent();
        } else {
            this.addUnjoinButton();
            this.addEventPageButton();
            if (eventWebSocket.players_status.game_status === 'NotReady' || eventWebSocket.players_status.tournament_status ==='NotReady') {
                this.title.innerHTML = 'Click ready when you are ready';
                this.createReadyButton();
            } else {
                this.title.innerHTML = 'Waiting for other players to be ready';
            };
            console.log('this.data', this.data);
            if (this.data && ((this.data.game && this.data.game.players.length < this.data.game.max_players)
                || (this.data.tournament && this.data.tournament.players.length < this.data.tournament.max_players))) {
                
                this.addInviteButton();
            }
        } 
        this.titleContainer.appendChild(this.title);
        console.log('home loader after render', this.title.innerHTML);
    }
}