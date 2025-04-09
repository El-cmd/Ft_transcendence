// Import all necessary modules
import { router } from './Router.js';
import { HTMLUtils } from './htmlutils/HTMLUtils.js';
import { isLoggedIn } from './accounts/utils.js';
import { chatWebSocket } from "./services/ChatWsManager.js"
import { eventWebSocket } from './services/EventWsManager.js';
import { globalMessageHandler } from './notifications/MessageNotificationHandler.js';

import { translations } from './traduction.js';
// import {}

// Fonction qui met à jour les éléments traduits en fonction de la langue choisie.
// function changeLanguage(lang) {
//   console.log("Changement de langue pour :", lang);
//   // Parcourt tous les éléments qui possèdent l'attribut data-i18n
//   document.querySelectorAll("[data-i18n]").forEach((el) => {
//     const key = el.getAttribute("data-i18n");
//     console.log("Élément trouvé avec data-i18n =", key, ":", el);
//     if (translations[lang] && translations[lang][key]) {
//       el.textContent = translations[lang][key];
//     }
//   });
//   // Sauvegarde de la langue choisie
//   localStorage.setItem('preferredLanguage', lang);
// }
// window.changeLanguage = changeLanguage;

// // Initialisation du sélecteur de langue lors du chargement du DOM.
// document.addEventListener("DOMContentLoaded", () => {
//   console.log("Le DOM est chargé, initialisation du jeu...");
  
//   setTimeout(() => {
//       if (typeof initPongGame2 === "function") {
//           initPongGame2();
//           console.log("Jeu Pong initialisé !");
//       } else {
//           console.error("initPongGame2 n'est pas défini !");
//       }
//   }, 500); // Attente pour être sûr que le canvas existe
// });

// // Fonction d'initialisation du sélecteur de langue (appelée après chargement dynamique).
// function initLanguageSelector() {
//   const langSelector = document.getElementById('language-selector');
//   if (langSelector) {
//     console.log("Initialisation du sélecteur de langue", langSelector);
//     langSelector.addEventListener('change', (event) => {
//       changeLanguage(event.target.value);
//     });
//     // Appliquer la langue sauvegardée ou la langue par défaut 'fr'
//     const savedLang = localStorage.getItem('preferredLanguage') || 'fr';
//     langSelector.value = savedLang;
//     changeLanguage(savedLang);
//   } else {
//     console.log("Sélecteur de langue introuvable !");
//   }
// }

async function loadHTML(url, elementId) {
    // console.log(`Chargement de : ${url}`);

    try {
        const response = await fetch(url);
        // console.log("🔍 Requête envoyée à :", url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url} : ${response.status} ${response.statusText}`);
        }
        const data = await response.text(); // text() is a promise
        const element = document.getElementById(elementId);
        if (!element)
            throw new Error(`Failed to load ${url} : element with id ${elementId} not found`);
        // console.log("innerHTML", data);
        element.innerHTML = data;
        // console.log(`Successfully loaded ${url}`);
        // initLanguageSelector();
    }
    catch (error) {
        // console.log(`Failed to load ${url} : ${error}`);
        throw error; // ?
    }
}



async function loadCommon() {
    await loadHTML('partials/common/header.html', 'header-placeholder');
    await loadHTML('partials/common/sidebar.html', 'sidebar-placeholder');
    await loadHTML('partials/common/footer.html', 'footer-placeholder');
    populateSidebarMenu();
    document.getElementById('user-action-btn').addEventListener('click', () => {
        console.log('Click on user-action-button !');
        if (isLoggedIn() && window.location.pathname !== '#/profile') {
            HTMLUtils.redirect('#/profile');
            // window.location.hash = '#/profile';
        } else if (!isLoggedIn() && window.location.pathname !== '#/login') {
            console.log('Redirecting to login page');
            HTMLUtils.redirect('#/login');
            // window.location.hash = '#/login';
    }
    });
}




function populateSidebarMenu() {
    const menu = document.getElementById('sidebarLinks');
    const mapNameToHref = {
        'home': '',
        'friends': '#/relation/:friends',
        'ranking': '#/ranking',
        'chat': '#/chat',
        'event history': '#/event-history',
        'join an event': '#/accessible-events',
    };

    for (const name in mapNameToHref) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        // a.href = mapNameToHref[name];
        a.className = 'sidebar-link';
        
        a.addEventListener('click', (event) => {
            // event.preventDefault();
            
            var sidebar = document.getElementById('sideMenuRight');
            var bsOffcanvas = bootstrap.Offcanvas.getInstance(sidebar);
            bsOffcanvas.hide();
            if (a.href !== window.location.href) {
                // closeSidebar();
                HTMLUtils.redirect(mapNameToHref[name]);
            } else {
                console.log('Same page');
                router.rerenderCurrentRoute();
            }
        });
        a.textContent = name;
        li.appendChild(a);
        menu.appendChild(li);
    }
}

export async function go(){
  document.addEventListener("DOMContentLoaded", async function () {
    try {
      // Initialize router
      console.log('Initialisation du router');
      
      // Vérifier si l'utilisateur est connecté
      const userLoggedIn = isLoggedIn();
      console.log('État de connexion utilisateur:', userLoggedIn ? 'Connecté' : 'Non connecté');
      
      // Charger la page initiale
      
      // Connecter les WebSockets si l'utilisateur est connecté
      if (userLoggedIn) {
        console.log('Tentative de connexion aux WebSockets...');
        
        // Essayer de connecter le WebSocket de chat
        try {
          await chatWebSocket.connect();
          console.log('WebSocket de chat connecté');
        } catch (chatError) {
          console.error('Erreur WebSocket chat:', chatError);
        }
        
        // Essayer de connecter le WebSocket d'événements
        try {
          await eventWebSocket.connect();
          console.log("WebSocket d'événements connecté");
        } catch (eventError) {
          console.error('Erreur WebSocket événements:', eventError);
        }
      }
      
      // Charger les éléments communs
      loadCommon();
      
    } catch (error) {
      console.error('Erreur initialisation app:', error);
    }
    router.loadInitialPage();
  });
}

// Subscribe to messages globally
chatWebSocket.subscribeMessageHandler(globalMessageHandler.handleMessage);

go()

// document.addEventListener("DOMContentLoaded", () => {
    //     const params = new URLSearchParams(window.location.search);
    //     const authCode = params.get("code");
    
    //     if (authCode) {
        //         console.log("Code d'autorisation reçu :", authCode);
        
        //         // Stocker la connexion
//         localStorage.setItem("isAuthenticated", "true");
//         console.log("Authentification enregistrée !");
//         console.log("isAuthenticated:", localStorage.getItem("isAuthenticated"));


//         // Nettoyer l'URL pour enlever le paramètre 'code'
//         window.history.replaceState({}, document.title, window.location.pathname);

//         // Masquer la fenêtre de connexion et afficher le contenu restreint
//         hideLoginModal();
//     } else {
//         // Vérifier si l'utilisateur est déjà connecté
//         if (localStorage.getItem("isAuthenticated") === "true") {
//             hideLoginModal();
//         } else {
//             showLoginModal();
//         }
//     }
// });