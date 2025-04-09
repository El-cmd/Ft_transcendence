import { WebSocketManager } from "./WebSocketManager.js";
import { 
    paddleStateReceived as paddleStateReceived2, 
    updateScoreBoardFromServer as updateScoreBoardFromServer2, 
    nextServerUpdate as nextServerUpdate2, 
    ballUpdate as ballUpdate2, 
    has_ball_authority 
    } from "../pong2.js";
import { 
    paddleStateReceived as paddleStateReceived4, 
    updateScoreBoardFromServer as updateScoreBoardFromServer4, 
    nextServerUpdate as nextServerUpdate4, 
    ballUpdate as ballUpdate4,
    replacePlayerByWall
    } from "../pong4.js";
import { HTMLUtils } from "../htmlutils/HTMLUtils.js";
import { router } from "../Router.js";
import { EventFetcher } from "../events/EventFetcher.js";
import { HomeLoader } from "../HomeLoader.js";
import { AccessibleEventsLoader } from "../events/loaders/AccessibleEvents.js";
import { EventDetailLoader } from "../events/loaders/EventDetail.js";
import { chatWebSocket } from "./ChatWsManager.js"
import { showToast } from "../htmlutils/ToastNotifications.js"
import { globalMessageHandler } from "../notifications/MessageNotificationHandler.js";
import { cleanup } from "../pong2.js"
import { GameLoader } from "../GameLoader.js";
import { isLoggedIn } from "../accounts/utils.js";

let wsEventManagerInstance = null;

class PlayerStatus {
    last_update = null;

    constructor() {
        this.init_status().then(() => {
                console.log('PlayerStatus: statut initialisé');
                console.log('PlayerStatus: statut du jeu:', this.game_status);
                console.log('PlayerStatus: statut du tournoi:', this.tournament_status);
                console.log('PlayerStatus: id du jeu actuel:', this.current_game_id);
                console.log('PlayerStatus: id du tournoi actuel:', this.current_tournament_id);
            }
        );

        this.init_status = this.init_status.bind(this);
        this.routing_update = this.routing_update.bind(this);
        this.update_status = this.update_status.bind(this);
        this.join_authorized = this.join_authorized.bind(this);
        this.end_event_update = this.end_event_update.bind(this);
    }

    async init_status() {
        this.last_update = new Date().getTime() / 1000;
        this.game_status = null;
        this.tournament_status = null;
        this.current_game_id = null;
        this.current_tournament_id = null;
        this.game_size = 0;

        if (isLoggedIn()) {
            const rsp = await new EventFetcher().fetchData('/events/player_status/')
            const data = await rsp.json();
            this.game_status = data.game_status;
            this.tournament_status = data.tournament_status;
            if (this.game_status != 'None') {
                this.current_game_id = data.game_id;
            }
            if (this.tournament_status != 'None') {
                this.current_tournament_id = data.tournament_id;
            }
        }
        console.log('PlayerStatus: statut initialisé');
        console.log('PlayerStatus: statut du jeu:', this.game_status);
        console.log('PlayerStatus: statut du tournoi:', this.tournament_status);
        console.log('PlayerStatus: id du jeu actuel:', this.current_game_id);
        console.log('PlayerStatus: id du tournoi actuel:', this.current_tournament_id);
    }

    routing_update() {
        if (this.game_status == 'InProgress') {
            router.enableForfeitCheck();
        } else if (this.game_status == 'None') {
            router.disableForfeitCheck();
            this.game_size = 0;
            if (router.currentLoader === GameLoader) {
                this.end_event_update('game');
            }
        } if (router.currentLoader === HomeLoader || router.currentLoader === EventDetailLoader){
            router.rerenderCurrentRoute();
        }
    }

    update_status(data) {
        if (this.last_update >= data.last_update) {
            console.log('PlayerStatus: update ignored');
            return;
        }
        this.last_update = data.last_update;
        if (data.game_status) {
            this.game_status = data.game_status;
        }
        if (data.tournament_status) {
            this.tournament_status = data.tournament_status;
        }
        if (this.game_status != 'None' && data.game_id) {
            this.current_game_id = data.game_id;
        }
        if (this.tournament_status != 'None' && data.tournament_id) {
            this.current_tournament_id = data.tournament_id;
        }
        console.log('PlayerStatus: statut du jeu:' + this.game_status + ' id:' + this.current_game_id);
        console.log('PlayerStatus: statut du tournoi:' + this.tournament_status + ' id:' + this.current_tournament_id);
        this.routing_update();
        
    }

    join_authorized() {
        return this.game_status === 'None' && this.tournament_status === 'None';
    }

    end_event_update(event_type) {
        let event_path = '/event/:';
        let redir_revent = null;
        router.disableForfeitCheck();
        if (router.currentLoader === GameLoader) {
            // cleanup(); // clean up animation // ln
        }
        if (this.game_status !== 'None') {
            redir_revent = this.current_game_id;
        }
        if (this.tournament_status !== 'None') {
            redir_revent = this.current_tournament_id;
        }

        if (event_type === 'game' || event_type === 'tournament_game' || event_type === 'tournament') {
            this.current_game_id = null; 
            this.game_status = 'None';
        } else if (event_type === 'tournament') {
            this.current_tournament_id = null;
            this.tournament_status = 'None';
        }
        this.last_update = new Date().getTime() / 1000;
        if (redir_revent === null) {
            return;
        }
        this.init_status().then(() => {
            console.log('PlayerStatus: statut du jeu:', this.game_status);
            console.log('PlayerStatus: statut du tournoi:', this.tournament_status);
            console.log('PlayerStatus: id du jeu actuel:', this.current_game_id);
            console.log('PlayerStatus: id du tournoi actuel:', this.current_tournament_id);
        });
        HTMLUtils.redirect(event_path + redir_revent);
    }
}


class EventWsManager extends WebSocketManager {
    players_status = null;
    game_ready = false;

    constructor() {
        if (wsEventManagerInstance) {
            return wsEventManagerInstance;
        }
        super('event');
        this.players_status = new PlayerStatus();
        this.lastBallUpdate = 0;
        // eventWebSocket.players_statusgame_size. = null;
        
        // Store the instance and bind message handler in one place
        wsEventManagerInstance = this;
        this.handleMessage = this.handleMessage.bind(this);
        wsEventManagerInstance.subscribeMessageHandler(this.handleMessage);
    }

    handleMessage(data) {
        console.log('EventWsManager handleMessage', data);
        if (data.type === 'paddle_update') {
            console.log('paddle_update received', data.payload);
            if (!eventWebSocket.players_status.game_size) {
                console.log('Game size undefined when handling websocket game update message, most likely bc game just ended');
                return;
            }
            eventWebSocket.players_status.game_size == 2 ? paddleStateReceived2(data.payload) : paddleStateReceived4(data.payload);
        }
        if (data.type === 'round_launch'){
            showToast('Tournament game about to start!', "success"); // ln : specify type of game (finale, semi finale, etc) et opponent's name ?
            // if (eventWebSocket.players_status.tournament_status !== 'None') {
                
            // }
        }
        if (data.type === 'game_launch') {
            console.log('game_launch received', data.payload, data.payload.num_players);
            eventWebSocket.players_status.game_size = data.payload.num_players;
            

            HTMLUtils.redirect('/game/:' + data.payload.num_players);
        }
        if (data.type === 'tournament_launch') {
            // if player is on /#/ -> rerender else redirect to home
            console.log('tournament_launch received', router.currentLoader);
            if (router.currentLoader == HomeLoader) {
                console.log('rerendering home')
                router.rerenderCurrentRoute();
            } else {
                console.log('redirecting to home')
                HTMLUtils.redirect('/');
            }
        }
        if (data.type === 'event_end') {
            eventWebSocket.players_status.game_size = null;
            this.game_ready = false;
            eventWebSocket.players_status.end_event_update(data.payload.event_type);
        }

        if (data.type === 'player_status') {
            console.log('updating status with:', data.status)
            wsEventManagerInstance.players_status.update_status(data.payload);
        }
        if (data.type === 'update_score_board') {
            if (!eventWebSocket.players_status.game_size) {
                console.log('Game size undefined when handling websocket game update message, most likely bc game just ended');
                return;
            }
            eventWebSocket.players_status.game_size == 2 ? updateScoreBoardFromServer2(data) : updateScoreBoardFromServer4(data);
        } 
        if (data.type === 'next_server_update'){
            if (!eventWebSocket.players_status.game_size) {
                console.log('Game size undefined when handling websocket game update message, most likely bc game just ended');
                return;
            }
            eventWebSocket.players_status.game_size == 2 ? nextServerUpdate2(data.payload) : nextServerUpdate4(data.payload);
        } 
        if (this.game_ready && data.type === 'ball_update') {  
            if (!eventWebSocket.players_status.game_size) {
                console.log('Game size undefined when handling websocket game update message, most likely bc game just ended');
                return;
            }
            eventWebSocket.players_status.game_size == 2 ? ballUpdate2(data.payload) : ballUpdate4(data.payload);
        }
        if (data.type === 'player_gave_up') {
            console.log('received player_gave_up for player : ', data.payload.player);
            if (!eventWebSocket.players_status.game_size) {
                console.log('Game size undefined when handling websocket game update message, most likely bc game just ended');
                return;
            }
            // do not do anything if Duo game, as a forfeit automatically means the end of the game
            if (eventWebSocket.players_status.game_size == 4)
                replacePlayerByWall(data.payload['player']);
        }


        if (data.type === 'new_invite') {
            console.log('New invite received', data.payload);
            globalMessageHandler.handleMessage(data); 
        }
        if (data.type === 'accessible_events_change'){
            // Refresh available events list if player is on /#/accessible-events
            console.log('accessible_events_change received');
            if (router.currentLoader === AccessibleEventsLoader) {
                router.rerenderCurrentRoute();
                console.log('rerendering accessible events');
            }
        } 
        if (data.type === 'event_detail_change') {
            console.log('event_detail_change received');
            if (router.currentLoader === EventDetailLoader || router.currentLoader === HomeLoader) {
                router.rerenderCurrentRoute();
                console.log('rerendering event detail');
            }
        }
    }

    async connect() {
        super.connect();
        await wsEventManagerInstance.players_status.init_status();
        // this.sendMessage('join');
    }
    // onError() {
    //     console.log('EventWsManager: error');
    // }
    // onClose() {
    //     console.log('EventWsManager: closed');
    // }
 
}
export const eventWebSocket = new EventWsManager();