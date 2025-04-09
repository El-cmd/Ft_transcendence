import { BasicLoader } from "./loaders/BasicLoader.js";
import { EventFetcher } from "./events/EventFetcher.js";
import { initPongGame2, cleanup as cleanUp2} from "./pong2.js";
import { router } from "./Router.js";
import { initPongGame4, cleanup as cleanUp4 } from "./pong4.js";
import { eventWebSocket } from "./services/EventWsManager.js";

let cleanUp;
export class GameLoader extends BasicLoader {
    constructor(params) {
        console.log('GameLoader constructor', params);
        const mode = params.nb_player.replace(':', '');
        
        // if (!mode || !['2', '4'].includes(mode) || eventWebSocket.players_status.game_status !== 'InProgress') {
        //     console.error('Invalid game mode or game already in progress');
        //     window.history.back();
        //     return;
        // }

        console.log('GameLoader mode =', mode);
        const htmlPartialPath = 'pong-game' + mode + '.html';
        console.log('---- in GameLoader, htmlPartialPath =', htmlPartialPath);
        super(htmlPartialPath, params);
        this.mode = mode;
        this.gameId = eventWebSocket.players_status.current_game_id;
    }

    async fetchData() {
        return new EventFetcher().fetchEvent(this.gameId);
    }

    loadSection() {

        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
            loadingScreen.classList.add("show"); // Afficher le loading
        } else {
            console.warn("L'élément #loading-screen est introuvable !");
        }

        setTimeout(async () => {
            try {
                console.log('in GameLoader.loadSection, this.params = ', this.params);
                
                if (this.mode == 2) {
                    console.log('Initialising pong game 2');
                    await initPongGame2(this.data.players);
                }
                else if (this.mode == 4) {
                    console.log('Initialising pong game 4');
                    await initPongGame4(this.data.players);
                }
            } catch (error) {
                console.error("Erreur lors du lancement du Pong :", error);
            }
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.classList.remove("show");
                }, 400);
            }
        }, 500); // Ajout d'une attente avant l'initiation
    }

    startGame() {

        const loadingScreen = document.getElementById("loading-screen");
        if (!loadingScreen) {
            console.error("Erreur : l'élément #loading-screen est introuvable !");
            return;
        }

        // Afficher l'écran de chargement
        loadingScreen.classList.add("show");

        setTimeout(() => {
            this.loadSection();
        }, 500); // Temps d'affichage du loading avant de charger le jeu
    }

    afterRender() {
        console.log('GameLoader afterRender');
        this.startGame();
    }

    destroy() {
        console.log('GameLoader destroy - cleaning up game');
        
        if (this.mode == 2) {
            console.log('Initialising pong game 2');
            cleanUp2();
        }
        else if (this.mode == 4) {
            console.log('Initialising pong game 4');
            cleanUp4();
        }
        // cleanUp(); // Call the cleanup function
        router.disableForfeitCheck(); // Double-check that forfeit check is disabled
    }
}