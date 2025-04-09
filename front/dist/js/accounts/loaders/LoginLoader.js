import { AccountBasicLoader } from './AccountBasicLoader.js';
import { login, isLoggedIn, refreshUserRelatedElements, basicLoginToJson } from '../utils.js';
import { AccountFetcher } from '../AccountFetcher.js';
import { HTMLUtils } from '../../htmlutils/HTMLUtils.js';

import { chatWebSocket } from "../../services/ChatWsManager.js"
import { eventWebSocket } from '../../services/EventWsManager.js';

export async function set_user_info() {
    if (!isLoggedIn()) {
        //console.error('User not logged in');
        return null;
    }
    const rsp = await new AccountFetcher().fetchMyProfile();
    const data = await rsp.json();
    //console.log('profile data', data);
    localStorage.setItem('current_username', data.username);
    localStorage.setItem('current_id', data.id);
    //console.log('current_username', localStorage.getItem('current_username'));
    //console.log('current_id', localStorage.getItem('current_id'));
}

export class LoginLoader extends AccountBasicLoader {
    constructor(params) {
        super('login-modal.html', params);
        //console.log('LoginLoader constructor and some changes and more');
    }

    showLoginModal() {
        //console.log("Début de showLoginModal()");
        // Vérifions si le DOM est prêt
        setTimeout(() => {
            try {
                //console.log("Exécution de showLoginModal() après délai");
                
                // Vérifier si bootstrap est disponible
                if (typeof bootstrap === 'undefined') {
                    //console.error("Bootstrap n'est pas chargé !");
                    return;
                }
                
                hideModals();
                //console.log("Recherche de l'élément modal");
                const modalElement = document.getElementById("login-modal");
                //console.log("Élément modal trouvé ?", modalElement);
                
                if (modalElement) {
                    // Retirer les anciens gestionnaires d'événements pour éviter les doublons
                    const newModalElement = modalElement.cloneNode(true);
                    modalElement.parentNode.replaceChild(newModalElement, modalElement);
                    
                    // Ajouter les écouteurs d'événements
                    newModalElement.addEventListener('submit', (event) => {
                        //console.log("Formulaire de connexion soumis");
                        this.handleLogin(event);
                    });
                    
                    const login42Button = newModalElement.querySelector("#btn-42");
                    if (login42Button) {
                        login42Button.addEventListener('click', (event) => {
                            //console.log("Bouton 42 cliqué");
                            this.handle42login(event);
                        });
                    } else {
                        //console.error("Bouton 42 non trouvé");
                    }
                    
                    //console.log("Affichage du modal...");
                    const loginModal = new bootstrap.Modal(newModalElement, { backdrop: 'static', keyboard: false });
                    loginModal.show();
                    //console.log("Modal affiché");
                } else {
                    //console.error("La modale de connexion n'a pas été trouvée dans le DOM!");
                }
            } catch (error) {
                //console.error("Erreur lors de l'affichage du modal:", error);
            }
        }, 300); // Délai plus long pour s'assurer que le DOM est complètement chargé
    }

    afterRender() {
        // Vérifie d'abord si l'utilisateur est déjà connecté
        if (isLoggedIn()) {
            //console.error('User already logged in, redirecting... but should have been redirected before');
            window.location.hash = '#/profile';
            return;
        }

        // La gestion du code OAuth est maintenant dans le Router.js
        // Afficher simplement la modale de connexion
        this.showLoginModal();
    }

    hideIfLoggedIn() {
        hideModals();
    }

    async loginSuccess() {
        // establish websocket connection here ? ou alors dans la redirection vers le profile apres s etre login, comme ca as besoin de le faire deux fois
        await chatWebSocket.connect();
        await eventWebSocket.connect();
        await set_user_info();
        
        //console.log('Login successful, redirecting...');
        // Update UI elements if needed
        // refreshUserRelatedElements();
        hideModals();

        // Redirect to dashboard
        HTMLUtils.redirect('/#/');
    }

    errorElement(content) {
        //console.error('Login failed');
        const errorElement = document.querySelector('#login-error');
        if (errorElement) {
            errorElement.textContent = content;
            errorElement.style.display = 'block';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        //console.log('Login form submitted');
        
        // Disable form while processing
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        
        try {
            //console.log('Attempting login...');
            const success = await login(async () => {
                //console.log('fetching login');
                const data = basicLoginToJson();
                return new AccountFetcher().fetchLogin(data);
            });
            
            if (success) {
                await this.loginSuccess();
                //console.log('Login successful');
            } else {
                this.errorElement('Login failed. Please check your credentials.');
            }
        } catch (error) {
            //console.error('Login failed:', error);
            this.errorElement('An error occurred. Please try again.');
        } finally {
            // Re-enable form
            submitButton.disabled = false;
        }
    }

    async handle42login(event) {
        //console.log('Soumission du formulaire de connexion 42');
        event.preventDefault();
        
        try {
            //console.log('Redirection vers OAuth 42...');
            // Masquer la modale de connexion avant la redirection
            hideModals();
            
            // Rediriger vers l'authentification 42
            new AccountFetcher().gogetToken();
            
            //console.log('Redirection en cours...');
        } catch (error) {
            //console.error('Erreur lors de la redirection vers 42:', error);
            this.errorElement('Une erreur s\'est produite lors de la redirection. Veuillez réessayer.');
        }
    }

    destroy() {
        this.hideIfLoggedIn();
    }
}

export class RegisterLoader extends AccountBasicLoader{
    constructor(params) {
        super('register.html', params);
    }

    async handleSignUp(event) {
        event.preventDefault();

        //console.log('Sign-up form submitted');
        
        const form = event.target;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const repeatedPassword = document.getElementById('repeated_password').value;
        
        console.log('Form data:', { username, password: '***', repeatedPassword: '***' });
        
        // Valider le pseudo - uniquement caractères alphanumériques
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        const hasInvalidUsernameChar = !usernameRegex.test(username);
        
        if (!username || hasInvalidUsernameChar) {
            this.errorElement("Pseudo invalide. Utilisez uniquement des lettres et des chiffres.");
            return;
        }
        
        // Vérifier la longueur du pseudo
        if (username.length > 15) {
            this.errorElement("Le pseudo est trop long. Maximum 15 caractères.");
            return;
        }
        
        // Vérifier si des caractères non autorisés sont présents dans le mot de passe
        const allowedCharsRegex = /^[a-zA-Z0-9]+$/;
        const hasInvalidChar = !allowedCharsRegex.test(password);
        
        // Vérifier si les mots de passe correspondent
        const passwordsMatch = password === repeatedPassword;
        
        if (hasInvalidChar) {
            this.errorElement("Le mot de passe contient des caractères non autorisés. Utilisez uniquement des lettres et des chiffres.");
            return;
        }
        
        if (!passwordsMatch) {
            this.errorElement("Les mots de passe ne correspondent pas.");
            return;
        }
        
        // Vérifier la longueur du mot de passe
        if (password.length > 15) {
            this.errorElement("Le mot de passe est trop long. Maximum 15 caractères.");
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validate username - only alphanumeric characters allowed
        if (data.username && !/^[a-zA-Z0-9]+$/.test(data.username)) {
            this.errorElement("Invalid username. Only alphanumeric characters are allowed.");
            return;
        }
        
        const loginLink = document.getElementById("login");

        if (loginLink) {
            loginLink.addEventListener("click", function(event) {
                event.preventDefault();
            window.location.hash = "#/login";
            });
        } else {
            //console.warn("L'élément #login n'a pas été trouvé.");
        }

        try {
            const response = await new AccountFetcher().fetchSignUp(data);
            if (response.ok) {
                //console.log("Inscription réussie, redirection vers le login...");
                this.hideRegisterModal();
                
                window.location.hash = '#/login';
            } else {
                this.errorElement("Échec de l'inscription. Veuillez vérifier vos informations.");
            }
        } catch (error) {
            //console.error("Échec de l'inscription. Réponse :", await response.json());
            this.errorElement("Une erreur s'est produite. Veuillez réessayer.");
        }
       
    }

    errorElement(content) {
        //console.error('Registration error:', content);
        const errorElement = document.querySelector('#register-error');
        if (errorElement) {
            errorElement.textContent = content;
            errorElement.style.display = 'block';
        }
    }
    
    // Validation du pseudo
    validateUsername(event) {
        console.log('validateUsername called');
        const username = event.target.value;
        const usernameWarning = document.getElementById('username-warning');

        // Vérifier les caractères autorisés (uniquement lettres et chiffres selon la politique)
        const allowedCharsRegex = /^[a-zA-Z0-9]+$/;
        const hasInvalidChar = !allowedCharsRegex.test(username);
        
        // Vérifier la longueur
        const isNearMaxLength = username.length >= 15;
        
        console.log('Username validation:', { username, hasInvalidChar, isNearMaxLength });
        
        if (usernameWarning) {
            if (hasInvalidChar) {
                usernameWarning.textContent = "Caractère non autorisé! Utilisez uniquement des lettres et des chiffres.";
                usernameWarning.style.display = 'block';
                usernameWarning.style.color = 'red';
            } else if (isNearMaxLength) {
                usernameWarning.textContent = "Attention: Vous approchez de la limite de 15 caractères!";
                usernameWarning.style.display = 'block';
                usernameWarning.style.color = 'orange';
            } else {
                usernameWarning.style.display = 'none';
            }
        } else {
            console.error('Username warning element not found');
        }
    }
    
    // Validation du mot de passe
    validatePassword(event) {
        console.log('validatePassword called');
        const password = event.target.value;
        const passwordWarning = document.getElementById('password-warning');

        // Vérifier les caractères autorisés (uniquement lettres et chiffres selon la politique)
        const allowedCharsRegex = /^[a-zA-Z0-9]+$/;
        const hasInvalidChar = !allowedCharsRegex.test(password);
        
        // Vérifier la longueur
        const isNearMaxLength = password.length >= 15;
        
        console.log('Password validation:', { password, hasInvalidChar, isNearMaxLength });
        
        if (passwordWarning) {
            if (hasInvalidChar) {
                passwordWarning.textContent = "Caractère non autorisé! Utilisez uniquement des lettres et des chiffres.";
                passwordWarning.style.display = 'block';
                passwordWarning.style.color = 'red';
            } else if (isNearMaxLength) {
                passwordWarning.textContent = "Attention: Vous approchez de la limite de 15 caractères!";
                passwordWarning.style.display = 'block';
                passwordWarning.style.color = 'orange';
            } else {
                passwordWarning.style.display = 'none';
            }
        } else {
            console.error('Password warning element not found');
        }
    }
    
    // Vérification de la correspondance des mots de passe
    checkPasswordMatch(password, repeatedPassword) {
        console.log('checkPasswordMatch called', { password, repeatedPassword });
        const passwordMatchWarning = document.getElementById('password-match-warning');
        
        if (passwordMatchWarning) {
            if (repeatedPassword && password !== repeatedPassword) {
                passwordMatchWarning.textContent = "Les mots de passe ne correspondent pas.";
                passwordMatchWarning.style.display = 'block';
                passwordMatchWarning.style.color = 'red';
            } else {
                passwordMatchWarning.style.display = 'none';
            }
        } else {
            console.error('Password match warning element not found');
        }
    }

    showRegisterModal() {
        hideModals();
        //console.log("showRegisterModal() a été appelée !");
        const modalElement = document.getElementById("register-modal");
        
        if (modalElement) {
            const loginModal = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
            loginModal.show();
            
            // Ajouter l'écouteur pour la soumission du formulaire
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.addEventListener('submit', (event) => { 
                    console.log('Form submit event caught');
                    this.handleSignUp(event); 
                });
                console.log('Form submit listener added to', registerForm);
            } else {
                console.error("Le formulaire d'inscription n'a pas été trouvé");
            }
            
            // Attendre un court instant pour s'assurer que le DOM est complètement chargé
            setTimeout(() => {
                // Ajouter la validation en temps réel
                const usernameInput = document.getElementById('username');
                const passwordInput = document.getElementById('password');
                const repeatedPasswordInput = document.getElementById('repeated_password');
                const usernameWarning = document.getElementById('username-warning');
                const passwordWarning = document.getElementById('password-warning');
                const passwordMatchWarning = document.getElementById('password-match-warning');
                
                console.log('Elements found:', { 
                    usernameInput: !!usernameInput,
                    passwordInput: !!passwordInput, 
                    repeatedPasswordInput: !!repeatedPasswordInput,
                    usernameWarning: !!usernameWarning,
                    passwordWarning: !!passwordWarning,
                    passwordMatchWarning: !!passwordMatchWarning
                });
                
                // Ajouter la validation pour le pseudo
                if (usernameInput) {
                    const boundValidateUsername = this.validateUsername.bind(this);
                    usernameInput.addEventListener('input', boundValidateUsername);
                    console.log('Username input listener added');
                    
                    // Déclencher une validation initiale
                    boundValidateUsername({ target: usernameInput });
                }
                
                // Ajouter la validation pour le mot de passe
                if (passwordInput) {
                    const boundValidatePassword = this.validatePassword.bind(this);
                    passwordInput.addEventListener('input', boundValidatePassword);
                    console.log('Password input listener added');
                    
                    // Déclencher une validation initiale
                    boundValidatePassword({ target: passwordInput });
                    
                    // Vérifier la correspondance des mots de passe
                    if (repeatedPasswordInput) {
                        const boundCheckMatch = () => {
                            this.checkPasswordMatch(passwordInput.value, repeatedPasswordInput.value);
                        };
                        repeatedPasswordInput.addEventListener('input', boundCheckMatch);
                        console.log('Repeated password input listener added');
                    }
                }
            }, 300);
        } else {
            //console.error("La modale de connexion n'a pas été trouvée !");
        }
    }

    hideRegisterModal() {
        hideModals();
    }

    afterRender() {
        //console.log('register....')
        if (isLoggedIn()) {
            // Redirect to dashboard if already logged in
            //console.error('User already logged in, redirecting... but should have been redirected before');
            window.location.hash = '/';
        } 
        this.showRegisterModal()
    }

    destroy(){
        hideModals();
    }
    
}

function hideModals() {
    const regModalElement = document.getElementById('register-modal');
    if (regModalElement) {
        const registerModal = bootstrap.Modal.getInstance(regModalElement);
        if (registerModal) {
            //console.log('Hiding register modal');
            registerModal.hide();
        } else {
            //console.warn('Register modal instance not found');
        }
    } else {
        //console.warn('Register modal element not found');
    }

    const logModalElement = document.getElementById('login-modal');
    if (logModalElement) {
        const loginModal = bootstrap.Modal.getInstance(logModalElement);
        if (loginModal) {
            //console.log('Hiding login modal');
            loginModal.hide();
        }
    }

    // Ensure no overlays are blocking the page
    const modalBackdrop = document.querySelector('.modal-backdrop');
    if (modalBackdrop) {
        //console.log('Removing modal backdrop');
        modalBackdrop.remove();
    }

    // Afficher le contenu restreint
    const restrictedContent = document.getElementById("restricted-content");
    if (isLoggedIn()) {
        //console.log("Vérification de #restricted-content :", restrictedContent);
        if (restrictedContent) {
            restrictedContent.style.display = "block";
            //console.log("Le contenu restreint a été affiché !");
        } else {
            //console.error("Impossible d'afficher le contenu restreint !");
        }
    }
}