 //Sélection du canvas et initialisation du contexte
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

 //Dimensions et positions initiales
let paddleHeight = 100, paddleWidth = 10;
let leftPaddleY = (canvas.height - paddleHeight) / 2;  // Position raquette gauche
let rightPaddleY = (canvas.height - paddleHeight) / 2; // Position raquette droite
let ballRadius = 10, x = canvas.width / 2, y = canvas.height / 2;
let dx = 2, dy = 2;

 //Variables pour les commandes
let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

 //Écoute des événements pour les touches
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
    if (e.key === "ArrowUp") upPressed = true;
    if (e.key === "ArrowDown") downPressed = true;
    if (e.key === "s" || e.key === "S") wPressed = true;
    if (e.key === "w" || e.key === "W") sPressed = true;
}

function keyUpHandler(e) {
    if (e.key === "ArrowUp") upPressed = false;
    if (e.key === "ArrowDown") downPressed = false;
    if (e.key === "s" || e.key === "S") wPressed = false;
    if (e.key === "w" || e.key === "W") sPressed = false;
}

 //Dessin de la balle
function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.closePath();
}

 //Dessin des raquettes
function drawPaddles() {
    // Raquette gauche
    ctx.beginPath();
    ctx.rect(0, leftPaddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.closePath();

    // Raquette droite
    ctx.beginPath();
    ctx.rect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.closePath();
}

 //Déplacement des raquettes
function movePaddles() {
    // Raquette gauche
    if (wPressed && leftPaddleY > 0) {
        leftPaddleY -= 5;
    }
    if (sPressed && leftPaddleY < canvas.height - paddleHeight) {
        leftPaddleY += 5;
    }

    // Raquette droite
    if (upPressed && rightPaddleY > 0) {
        rightPaddleY -= 5;
    }
    if (downPressed && rightPaddleY < canvas.height - paddleHeight) {
        rightPaddleY += 5;
    }
}

 //Logique du jeu Pong
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall();
    drawPaddles();

    // Mouvement de la balle
    if (y + dy < ballRadius || y + dy > canvas.height - ballRadius) {
        dy = -dy; // Rebond sur les bords haut et bas
    }

    // Rebond sur la raquette gauche
    if (x + dx < paddleWidth && y > leftPaddleY && y < leftPaddleY + paddleHeight) {
        dx = -dx;
    }

    // Rebond sur la raquette droite
    if (x + dx > canvas.width - paddleWidth - ballRadius && y > rightPaddleY && y < rightPaddleY + paddleHeight) {
        dx = -dx;
    }

    // Vérifie si la balle sort du terrain (fin de manche)
    if (x + dx < 0 || x + dx > canvas.width) {
        // Réinitialisation de la balle au centre
        x = canvas.width / 2;
        y = canvas.height / 2;
        dx = -dx; // Changer de direction
    }

    // Met à jour la position de la balle
    x += dx;
    y += dy;

    // Déplacement des raquettes
    movePaddles();
}

 //Animation du jeu
setInterval(draw, 10)

// Sélectionner le bouton
const loginBtn = document.getElementById('Connexion');

// Ajouter un écouteur d'événement pour le clic
loginBtn.addEventListener('click', showLoginForm);

function showLoginForm() {
    // Vérifier si le formulaire existe déjà
    if (document.getElementById('loginForm'))
        return; // Ne rien faire si le formulaire est déjà affiché

    // Créer le conteneur pour le formulaire (optionnel, pour styliser)
    const formContainer = document.createElement('div');
    formContainer.id = 'formContainer';

    // Créer l'élément du formulaire
    const form = document.createElement('form');
    form.id = 'loginForm';

    // Créer les champs du formulaire

    // Label pour le nom d'utilisateur
    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Nom d\'utilisateur :';
    usernameLabel.htmlFor = 'username';

    // Champ de saisie pour le nom d'utilisateur
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.name = 'username';
    usernameInput.id = 'username';
    usernameInput.required = true;


     // Bouton de soumission
     const ft_Btn = document.createElement('button');
     ft_Btn.type = 'submit';
     ft_Btn.textContent = 'Se connecter avec 42';
    // Bouton de soumission
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Se connecter en tant quInvité';

    // Bouton pour fermer le formulaire
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Fermer';

    // Ajouter un événement pour fermer le formulaire
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(formContainer);
        // Enlever l'effet de flou
        document.body.classList.remove('blur');
    });

    // Assembler les éléments du formulaire
    form.appendChild(usernameLabel);
    form.appendChild(usernameInput);
    form.appendChild(submitBtn);
    form.appendChild(ft_Btn);
    form.appendChild(closeBtn);

    // Ajouter le formulaire au conteneur
    formContainer.appendChild(form);

    // Ajouter le formulaire au body
    document.body.appendChild(formContainer);

    // Ajouter l'effet de flou au body
    document.body.classList.add('blur');

    // Ajouter un gestionnaire pour la soumission du formulaire
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Récupérer les valeurs des champs
        const username = usernameInput.value;
        // Faire quelque chose avec les données (ex: authentification)
        console.log('Nom d\'utilisateur :', username);
        // Supprimer le formulaire après soumission
        document.body.removeChild(formContainer);
        // Enlever l'effet de flou
        document.body.classList.remove('blur');
    });
}
