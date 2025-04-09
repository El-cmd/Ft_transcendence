document.addEventListener("DOMContentLoaded", function () {
    // Vérifie si un utilisateur est connecté
    const userData = JSON.parse(localStorage.getItem("user"));

    if (userData) {
        console.log("Utilisateur connecté :", userData);

        // Mise à jour de l'interface avec les infos utilisateur
        if (document.getElementById("profile-pic")) {
            document.getElementById("profile-pic").src = userData.profile_picture || "default.png";
        }

        if (document.getElementById("username-display")) {
            document.getElementById("username-display").innerText = userData.username;
        }
    }
});

// Fonction pour stocker les données utilisateur après connexion via 42
function storeUserData(user) {
    localStorage.setItem("user", JSON.stringify(user));
}
