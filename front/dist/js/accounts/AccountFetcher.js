import { Fetcher } from "../fetchers/Fetcher.js";

export class AccountFetcher extends Fetcher {

    constructor() {
        super();
        this.backBaseUrl = '/api/accounts';
    }

    async fetchSignUp(data) {
        return this.doPostFetch('register/', data);
    }

    async fetchLogin(data) {
        return this.doPostFetch('login/', data);
    }

    // async fetchEdit(data, id) {
    //     console.log('data', data);
    //     return this.doPatchFetch('profiles/' + id + '/', data);
    // } remettre

    async fetchEdit(formData, userId) {
        const response = await fetch(`/profiles/${userId}/`, {
            method: "PATCH",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token") // Ne pas mettre Content-Type ici !
            },
            body: formData
        });
    
        return response.json();
    }
    
    async fetchMyProfile() {
        return this.fetchData('profiles/get_profile/');
    }

    async fetchProfile(profileId) {
        return this.fetchData(`profiles/${profileId}/`);
    }

    async fetchRelation(rel_type) {
        return this.fetchData(`profiles/relation/${rel_type}/`);
    }

    async fetchAllUsers() {
        return this.fetchData('profiles/');
    }

    async fetchSearchedUsers(searchTerm) {
        return this.fetchData(`profiles/search_users/?query=${encodeURIComponent(searchTerm)}`);
    }

    gogetToken() {
        console.log('Redirection vers OAuth 42 via le backend');
        const redirectUri = window.location.protocol  + '//' + window.location.hostname + ':' + window.location.port;
        
        // Utiliser l'endpoint oauth2_login du backend pour la redirection
        const backendOAuthUrl = `/api/accounts/oauth2/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
        console.log('URL d\'authentification 42 (via backend) :', backendOAuthUrl);
        
        // Rediriger vers le backend qui gérera ensuite la redirection vers l'API 42
        window.location.href = backendOAuthUrl;
    }

    async fetch42Callback(authCode) {
        console.log("Code d'autorisation OAuth reçu:", authCode);
        console.log("Envoi du code au serveur pour échange contre un token");
        return this.doPostFetch('oauth2/callback/', { 'code': authCode });
    }
    
    // Garder l'ancienne méthode avec la faute d'orthographe pour compatibilité
    async fetch42Callaback(authCode) {
        console.log("Utilisation de l'ancienne méthode avec faute d'orthographe");
        return this.fetch42Callback(authCode);
    }
}
