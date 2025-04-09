import { initPongGameLocal } from "./local_pong.js";
import { initPongGame2Local } from "./local_pong2.js";
import { initPongGame4Local } from "./local_pong4.js";
import { BasicLoader } from "../loaders/BasicLoader.js";
// import { cleanup } from "../pong2.js"
import { cleanup1Local } from "./local_pong.js";
import { cleanup2Local } from "./local_pong2.js";
import { cleanup4Local } from "./local_pong4.js";

export class LocalGameLoader extends BasicLoader {
    constructor(params) {
        console.log('GameLoader constructor', params);
        const mode = params.nb_player.replace(':', '');

        // console.log('GameLoader constructor', mode);
        if (mode === 'solo') {
            super('pong-game.html', params);
        } else if (mode === 'duo') {
            super('pong-game2-local.html', params);
        } else {
            super('pong-game4-local.html', params);
        }
        this.mode = mode;

    }

    destroy() { // Call the cleanup function
        console.log('LocalGameLoader destroy - cleaning up game', this.mode);
        if (this.mode === 'solo') {
            cleanup1Local();
        } else if (this.mode === 'duo') {
            cleanup2Local();
        } else if (this.mode === 'multi') {
            console.log('cleaning up 4 players game');
            cleanup4Local();
        }
    }

    loadSection() {

        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
            loadingScreen.classList.add("show"); // Afficher le loading
        } else {
            console.warn("L'élément #loading-screen est introuvable !");
        }

        setTimeout(() => {
            try {

                if (this.mode === 'solo') {
                    initPongGameLocal(); // Démarrer le Pong solo
                    // console.log("Pong solo lancé avec succès !");
                }
                else if (this.mode === 'duo') {
                    initPongGame2Local(); // Démarrer le Pong duo
                    // console.log("Pong duo lancé avec succès !");
                }
                else if (this.mode === 'multi') {
                    initPongGame4Local(); // Démarrer le Pong duo
                    // console.log("Pong multi lancé avec succès !");
                }

            } catch (error) {
                console.error("Erreur lors du lancement du Pong :", error);
            }

            // Masquer l'écran de chargement après 1 seconde
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.classList.remove("show");
                }, 400);
            }
        }, 500); // Ajout d'une attente avant l'initiation
    }

    startGame() {
        // console.log("Mode sélectionné :", this.mode);

        const loadingScreen = document.getElementById("loading-screen");
        if (!loadingScreen) {
            console.error("Erreur : l'élément #loading-screen est introuvable !");
            return;
        }

        // Afficher l'écran de chargement
        loadingScreen.classList.add("show");

        setTimeout(() => {
            if (this.mode === 'solo') {
                // section alreday load by game loader
                this.loadSection(); // Charge le Pong
            } else if (this.mode === 'duo') {
                this.loadSection();
            } else if (this.mode === 'multi') {
                this.loadSection();
            }
        }, 500); // Temps d'affichage du loading avant de charger le jeu
    }

    afterRender() {
        console.log('LocalGameLoader afterRender');
        this.startGame(this.params.nb_player.replace(':', ''));
        // console.log('After game satr')
    }

    // destroy() {
    //     console.log('LocalGameLoader destroy - cleaning up game');
    //     cleanup(); // Call the cleanup function
    // }
}