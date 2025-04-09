import { OptionsMaker } from "./OptionsMaker.js";
import {logout} from '../accounts/utils.js';
import { HTMLUtils } from "../htmlutils/HTMLUtils.js";



async function fetchTestToken() {
    const response = await fetch('/api/accounts/test_token/', new OptionsMaker().options);
    return response.status;
}

export async function refreshable() {
    if (!localStorage.getItem('refreshToken')) {
        console.log('No refresh token found');
        return false;
    }
    return true;
}


export class Fetcher {
    backBaseUrl = '';
    #refreshUrl = `/api/accounts/token/refresh/`;
    #testTokenUrl = `/api/accounts/test_token/`;

    async refreshToken() {
        try {
            console.log('Refreshing token');
            if (!await refreshable()) {
                console.log('No refresh token found');
                return false;
            }
            localStorage.removeItem('accessToken');
            const response = await fetch(this.#refreshUrl, new OptionsMaker().refresh());
            console.log('response', response, response.data);
            if (!response.ok) {
                console.error('Error refreshing token');
                logout();
                return false;
            }
            const data = await response.json();
            localStorage.setItem('accessToken', data.access);
            console.log('new access token');
            return true;
        }
        catch (error) {
            console.error('Error during token refresh:', error);
            logout();
            return false;
        }
    }

    async getValidToken() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.log('Error while getting valid access token : no access token available');
            // try getting token ?
            return null; // ?
        }
        const response = await fetch(this.#testTokenUrl, new OptionsMaker().options); // c good pr les options ?
        if (response.status == 401 && !await this.refreshToken()) {
            console.log('Token refresh failed, user needs to login again');
            // redirect to login page ?
            logout();
            window.location.hash = '#/login';  // ln
            return null; // ? 
        }
        return localStorage.getItem('accessToken');
    }

    async fetchCurrent() {
        return this.fetchData('api/events/events/currents/', {}, {});
    }

    async fetchData(endpoint, options = {}, params = {}, baseUrlOverride = null) {
        let url;
        let response;
        
        try {
            if (endpoint.startsWith('/')) {
                endpoint = endpoint.substring(1);
            }
            
            // Utiliser l'URL de base fournie ou celle par défaut de la classe
            let baseUrl = baseUrlOverride || this.backBaseUrl;
            
            // S'assurer que baseUrl a un protocole (http:// ou https://)
            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                if (baseUrl.startsWith('/')) {
                    // URL relative, ajouter l'origine (protocole + domaine)
                    baseUrl = window.location.origin + baseUrl;
                } else {
                    // Ni protocole ni slash, ajouter https:// par défaut
                    baseUrl = window.location.origin + '/' + baseUrl;
                }
            }
            
            // S'assurer qu'il n'y a pas de double slash entre baseUrl et endpoint
            if (baseUrl.endsWith('/') && endpoint.startsWith('/')) {
                endpoint = endpoint.substring(1);
            } else if (!baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
            
            url = new URL(`${baseUrl}${endpoint}`);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            options = new OptionsMaker(options).options;

            try {
                response = await fetch(url, options);
                
                if (response.status === 401 || response.status === 403) {
                    if (await this.refreshToken()) {
                        options = new OptionsMaker(options).options;
                        response = await fetch(url.toString(), options);
                    } else {
                        window.location.hash = '#/login';
                    }
                }
                
                console.log(`Réponse reçue - Status: ${response.status}`);
            } catch (fetchError) {
                console.log(`Erreur lors de la requête fetch:`, fetchError);
                return new Response(JSON.stringify({ error: 'Erreur réseau', message: fetchError.message }), { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
            return response;
            
        } catch (error) {
            console.error('Erreur dans fetchData:', error);
            // Retourner une réponse vide plutôt que de faire planter l'application
            return new Response(JSON.stringify({ error: 'Erreur de requête', message: error.message }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    async doPostFetch(url, data) {
        console.log("📡 Données envoyées à", url, ":", JSON.stringify(data));
        console.log("📝 Données envoyées :", JSON.stringify(data));
        return this.fetchData(url, new OptionsMaker().post(data));
    }

    async doPatchFetch(url, data) {
        console.log("📡 Données envoyées à", url, ":", JSON.stringify(data));
        console.log("📝 Données envoyées :", JSON.stringify(data));
        return this.fetchData(url, new OptionsMaker().patch(data));
    }

    async fetchDoAction(action) {
        console.log('action', action);
        const response = await this.fetchData(action);
        if (response.ok) {
            // redirect to self
            HTMLUtils.redirect(window.location.hash);
        }
    }
}
