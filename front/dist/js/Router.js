import { isLoggedIn } from './accounts/utils.js';
import { Fetcher } from './fetchers/Fetcher.js';
import { EventFetcher } from './events/EventFetcher.js';
import {ErrorLoader} from './loaders/ErrorLoader.js';
import { AccountFetcher } from "./accounts/AccountFetcher.js"
import { login } from "./accounts/utils.js";
import { chatWebSocket } from "./services/ChatWsManager.js";
import { eventWebSocket } from "./services/EventWsManager.js";



export class Router {

    constructor(routes) {
        this.routes = routes;
        this.rootElement = document.querySelector("#main-content");

        /* Bind methods to this instance
        When you use a class method as a callback, this can lose its context.
        Binding ensures this always refers to your router instance */
        this.navigate = this.navigate.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        window.addEventListener("hashchange", () => {
            this.handleNavigation();
        });

        document.addEventListener("click", e => {
            if (e.target.matches("[data-link]")) {
                e.preventDefault();
                console.log('someone clicked!');
                const href = e.target.getAttribute("href");
                window.location.hash = href;
            }
        });
        console.log('before initial page load');

        // Add properties for game navigation handling
        this.localPlayer = null;
        this.originalNavigate = this.navigate;
        this.originalRedirect = this.redirect;
        
        // Bind methods again to ensure they work properly
        this.enableForfeitCheck = this.enableForfeitCheck.bind(this);
        this.disableForfeitCheck = this.disableForfeitCheck.bind(this);
    }

    loadInitialPage() {
        console.log('Loading initial page - Protocol: ' + window.location.protocol);
        // S'assurer que la navigation initiale fonctionne bien
        const path = window.location.hash.slice(1) || "/";
        console.log('Initial path: ' + path);
        console.log('Status : ' + eventWebSocket.players_status.game_status);
        if (eventWebSocket.players_status.game_status === 'InProgress') {
            console.log('Game in progress, redirecting to game page');
            this.redirect('/game/:' + eventWebSocket.players_status.game_size);
        }

        if (path === "/") {
            console.log('On root path, forcing render of home page');
            return this.renderRoute(path);
        }
        
        this.handleNavigation();
    }

    async handleNavigation() {
        if (eventWebSocket.players_status.game_status === 'InProgress' && window.location.hash !== '#/game/:' + eventWebSocket.players_status.game_size) {
            this.quitGameInProgess();
        }
        const path = window.location.hash.slice(1) || "/";
        await this.renderRoute(path);
    }

    async handleCallback(authCode) {
        console.log("Code d'autorisation reçu dans le Router:", authCode);
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
            const success = await login( async () => {
                const response = await new AccountFetcher().fetch42Callback(authCode);
                console.log('Réponse de fetch42Callback:', response);
                return response;
            });
            
            if (success) {
                console.log('Connexion OAuth réussie, redirection vers le profil');
                // Connexion aux WebSockets après authentification réussie
                try {
                    await chatWebSocket.connect();
                    await eventWebSocket.connect();
                    await set_user_info();
                    console.log('Connexion WebSocket établie après login OAuth');
                } catch (wsError) {
                    console.error('Erreur lors de la connexion WebSocket:', wsError);
                }
                
                HTMLUtils.redirect('/profile');
            } else {
                console.error('Échec de la connexion OAuth');
                window.location.hash = '#/login';
            }
        } catch (error) {
            console.error('Erreur lors du traitement du code OAuth:', error);
            window.location.hash = '#/login';
        }
    }

    async code_in_url() {
        console.log('URL avec code détecté:', window.location.href);
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            console.log('Code OAuth 42 extrait de l\'URL:', code);
            await this.handleCallback(code);
        } else {
            console.error('Code OAuth manquant dans l\'URL malgré la présence du paramètre');
        }
    }
    
    async renderRoute(path) {
        // Vérifier si un code d'authentification OAuth 42 est présent dans l'URL
        if (window.location.search.includes('code=')) {
            await this.code_in_url();
            return this.redirect('/');
        }
        // Remove leading # if present
        path = path.replace('#', '');

        console.log('Rendering route:', path);
        const match = this.matchRoute(path); 
        if (!match) {
            return this.redirect("/")
        }
        if (!isLoggedIn() && match.route.loader !== LoginLoader && match.route.loader !== RegisterLoader ) {
            return this.redirect("/login")
        }
        if (isLoggedIn() && (match.route.loader === LoginLoader || match.route.loader === RegisterLoader)) {
            return this.redirect("/")
        }

        console.log('Rendering view:', match.route)
        this.currentLoader = match.route.loader;
        
        const new_instance = new match.route.loader(match.params);

        // Clean up previous view if needed
        if (this.currentView && this.currentView.destroy) {
            this.currentView.destroy();
        }
        // Update current view
        this.currentView = new_instance;

        try {
            console.log('Loading view:', this.currentView);
            await this.currentView.load();
        } catch (error) {
            console.error("Error rendering view:", error);
            this.currentView = new ErrorLoader(match.params, error);
            this.currentView.load();
        }
    }

    matchRoute(path) {
        for (const route of this.routes) {
            // Handle dynamic routes like /chat/:id
            const pathParts = path.split("/").filter(Boolean);
            const routeParts = route.path.split("/").filter(Boolean);

            if (pathParts.length !== routeParts.length) continue;

            const params = {};
            let isMatch = true;

            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(":")) {
                    const paramName = routeParts[i].slice(1);
                    params[paramName] = pathParts[i];
                } else if (routeParts[i] !== pathParts[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                return { route, params };
            }
        }
        return null;
    }

    navigate(url) {
        window.location.hash = url;
    }

    redirect(path) {
        this.navigate(path);
    }

    async rerenderCurrentRoute() {
        const path = window.location.hash.slice(1) || "/";
        await this.renderRoute(path);
    }

    enableForfeitCheck() {
        this.disableForfeitCheck();
        
        // Define the beforeUnloadHandler as an arrow function to maintain 'this' context
        this.beforeUnloadHandler = (event) => {
            console.log('Beforeunload event triggered');
            event.preventDefault();
            event.returnValue = "You are currently in a game. Leaving may forfeit the match.";
            return event.returnValue;
        };
        
        window.addEventListener("beforeunload", this.beforeUnloadHandler);
        console.log('Forfeit check enabled');
    }
    
    disableForfeitCheck() {
        console.log('Disabling forfeit check');
        if (this.beforeUnloadHandler) {
            console.log('Removing beforeunload event listener');
            try {
                window.removeEventListener("beforeunload", this.beforeUnloadHandler);
            } catch (e) {
                console.error('Error removing event listener:', e);
            }
            this.beforeUnloadHandler = null;  // Clear the reference
        }
        
        // Force remove ALL beforeunload event handlers as a fallback
        window.onbeforeunload = null;
        console.log('Forfeit check disabled');
    }

    quitGameInProgess(url) {
        if (confirm('You are currently in a game. If you leave, you will forfeit. Are you sure?')) {
            console.log('Navigating away from game. Sending quit message');
            // Send forfeit message
            if (eventWebSocket && eventWebSocket.isConnected()) {
                eventWebSocket.sendMessage('quit', JSON.stringify({
                    // player: this.localPlayer
                }));
            }
            eventWebSocket.players_status.end_event_update();
            this.disableForfeitCheck();
        } else {
            const currentPath = window.location.hash.slice(1);
            if (!currentPath.startsWith('/game/')) {
                window.history.pushState({}, '', '#/game/:' + eventWebSocket.players_status.game_size);
            }
        }
    }

}


import { routes } from './routes.js';
import { HTMLUtils } from './htmlutils/HTMLUtils.js';
import { LoginLoader, RegisterLoader, set_user_info } from './accounts/loaders/LoginLoader.js';

export const router = new Router(routes);
