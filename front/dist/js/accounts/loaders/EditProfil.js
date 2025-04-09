import { AccountBasicLoader } from "./AccountBasicLoader.js";
import { ProfileLoader } from "./ProfileLoader.js";
import { AccountFetcher } from "../AccountFetcher.js";

export class EditProfileLoader extends AccountBasicLoader {
    constructor(params) {
        super('edit-profil.html', params);
    }

    async fetchData() {
        return new AccountFetcher().fetchMyProfile();
    }

    afterRender() {
        const data = this.data;
        const modalElement = document.getElementById("edit-form");

        document.getElementById("description").value = data.bio || "";

        // Vérifier que l'élément existe avant de lui assigner une valeur
        const avatarPreview = document.getElementById("avatar-preview");
        const avatarInput = document.getElementById("avatar");
        
        if (avatarPreview) {
            if (data.avatar) {
                // Si l'URL retournée par l'API ne contient pas le préfixe complet
                if (!data.avatar.startsWith('http')) {
                    avatarPreview.src = `https://localhost:8443${data.avatar}`;
                } else {
                    avatarPreview.src = data.avatar;
                }
            } else {
                avatarPreview.src = "/public/default-avatar.jpg";  // Avatar par défaut
            }
            avatarPreview.style.display = "block";
        } else {
            console.error("avatar-preview n'existe pas dans le DOM !");
        }

        modalElement.addEventListener('submit', (event) => { this.handleEdit(event) });

        // Vérifier si c'est un utilisateur 42 en utilisant le champ is_42_user du profil
        if (data.is_42_user && avatarInput) {
            // Désactiver l'upload d'avatar pour les utilisateurs 42
            avatarInput.disabled = true;
            
            // Masquer éventuellement le label aussi pour plus de clarté
            const avatarLabel = document.querySelector('label[for="avatar"]');
            if (avatarLabel) {
                avatarLabel.style.opacity = "0.5";
            }
            
            // Créer un message d'information
            const messageDiv = document.createElement("div");
            messageDiv.className = "alert alert-info mt-2";
            messageDiv.textContent = "Les utilisateurs authentifiés via 42 ne peuvent pas modifier leur avatar.";
            
            // Insérer le message après l'input d'avatar
            if (avatarInput.parentNode) {
                avatarInput.parentNode.insertBefore(messageDiv, avatarInput.nextSibling);
            }
        }
        
        // Gestion de la sélection d'un nouvel avatar (seulement si l'input n'est pas désactivé)
        if (avatarInput && !avatarInput.disabled) {
            avatarInput.addEventListener("change", function (event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        if (avatarPreview) {
                            avatarPreview.src = e.target.result;
                            avatarPreview.style.display = "block";
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        } else if (!avatarInput) {
            console.error("avatar input n'existe pas dans le DOM !");
        }
    }

    async handleEdit(event) {
        event.preventDefault();
        console.log("Formulaire de modification soumis");
        
        // Vérifier si le token existe
        const token = localStorage.getItem("accessToken");
        console.log("Token utilisé:", token ? "Token présent" : "Token absent");

        if (!token) {
            console.error("Pas de token d'authentification trouvé");
            return;
        }
        
        const formData = new FormData();
        formData.append("bio", document.getElementById("description").value);

        // N'ajouter l'avatar que si l'utilisateur n'est pas un utilisateur 42
        const avatarInput = document.getElementById("avatar");
        if (!this.data.is_42_user && avatarInput && avatarInput.files.length > 0) {
            formData.append("avatar", avatarInput.files[0]);
        }

        try {
            const response = await fetch(`/api/accounts/profiles/${this.data.id}/`, {
                method: "PATCH", 
                body: formData,
                headers: {
                    "Authorization": `Bearer ${token || ''}`,
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Réponse du serveur:", errorText);
                throw new Error(`Erreur HTTP ${response.status}`);
            }

            console.log("Modification réussie");
            window.location.hash = "#/profile";  // Redirection après succès

        } catch (error) {
            console.error("Erreur lors de la modification :", error);
        }
    }

    EditFormToFormData() {
        const formData = new FormData();
        const avatarInput = document.getElementById('avatar');
        const bio = document.getElementById('description').value;

        // Si un fichier est sélectionné, l'ajouter à FormData
        if (avatarInput.files.length > 0) {
            formData.append("avatar", avatarInput.files[0]);
        } else {
            console.log("Aucun nouvel avatar sélectionné, on garde l'ancien.");
        }

        formData.append("bio", bio);

        return formData;
    }
}
