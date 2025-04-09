import { AccountFetcher } from "./AccountFetcher.js";
import { Fetcher } from "../fetchers/Fetcher.js";
import { chatWebSocket } from "../services/ChatWsManager.js"
import { eventWebSocket } from "../services/EventWsManager.js";
import { router } from "../Router.js";

export function isLoggedIn() {
    console.log('Vérification de la connexion');
    console.log(!!localStorage.getItem('accessToken') || !!localStorage.getItem('refreshToken'));
    return !!localStorage.getItem('accessToken');
}

export function refreshUserRelatedElements(){

    if (!!isLoggedIn()) {
        console.log('User is logged in');
        window.location.hash = '#/profile';
    } else {   
        console.log('User is not logged in');
        window.location.hash = '#/login';
    }
}

export function basicLoginToJson() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    return { "username": username, "password": password };
}


export async function login(lambda) {
    console.log('Début du processus de login');
    try {
        // Déconnexion préalable pour éviter les conflits
        logout();
        
        // Appel de la fonction de login passée en paramètre
        const response = await lambda();
        console.log('Réponse du serveur:', response);
        
        if (!response) {
            console.error('Réponse invalide du serveur');
            return false;
        }
        
        if (response.ok) {
            try {
                const data = await response.json();
                console.log('Données de login reçues:', data);
                
                if (data.access && data.refresh) {
                    localStorage.setItem('accessToken', data.access);
                    localStorage.setItem('refreshToken', data.refresh);
                    console.log('Tokens stockés avec succès dans localStorage');
                    console.log('Login réussi!');
                    return true;
                } else {
                    console.error('Données de token manquantes dans la réponse:', data);
                    return false;
                }
            } catch (parseError) {
                console.error('Erreur lors du parsing de la réponse JSON:', parseError);
                return false;
            }
        } else {
            console.error('Échec de la connexion. Statut:', response.status);
            try {
                const errorData = await response.text();
                console.error('Détails de l\'erreur:', errorData);
            } catch (e) {
                console.error('Impossible de lire les détails de l\'erreur');
            }
            return false;
        }
    } catch (error) {
        console.error('Exception lors du processus de login:', error);
        return false;
    }
}

export function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('current_username');
    localStorage.removeItem('current_id');
    console.log('User logged out (or simply removed tokens)');
    chatWebSocket.disconnect();
    eventWebSocket.disconnect();
}


export function handleLogout(event) {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        logout();
        
    }
    //     refreshUserRelatedElements();
    // }
}


export function addProfileActionsReftoContainer(user, user_container) {
    for (let action in user.actions) {
        const actionButton = document.createElement('button');
        actionButton.textContent = action;
        actionButton.onclick = () => {
            console.log('action', action);
            (async () => {
                const response = await new Fetcher().fetchDoAction(user.actions[action]);
                console.log('response', response);
            })();
        };
        user_container.appendChild(actionButton);
    }
}