// Sélection du canvas et initialisation du contexte
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// Dimensions et positions initiales
let paddleHeight = 100, paddleWidth = 10;
let leftPaddleY = (canvas.height - paddleHeight) / 2;  // Position raquette gauche
let rightPaddleY = (canvas.height - paddleHeight) / 2; // Position raquette droite
let ballRadius = 10, x = canvas.width / 2, y = canvas.height / 2;
let dx = 2, dy = 2;

// Variables pour les commandes
let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

// Écoute des événements pour les touches
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
    if (e.key === "ArrowUp") upPressed = true;
    if (e.key === "ArrowDown") downPressed = true;
    if (e.key === "w" || e.key === "W") wPressed = true;
    if (e.key === "s" || e.key === "S") sPressed = true;
}

function keyUpHandler(e) {
    if (e.key === "ArrowUp") upPressed = false;
    if (e.key === "ArrowDown") downPressed = false;
    if (e.key === "w" || e.key === "W") wPressed = false;
    if (e.key === "s" || e.key === "S") sPressed = false;
}

// Dessin de la balle
function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();
}

// Dessin des raquettes
function drawPaddles() {
    // Raquette gauche
    ctx.beginPath();
    ctx.rect(0, leftPaddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#0095DD";
    ctx.fill();
    ctx.closePath();

    // Raquette droite
    ctx.beginPath();
    ctx.rect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#DD9500";
    ctx.fill();
    ctx.closePath();
}

// Déplacement des raquettes
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

// Logique du jeu Pong
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

// Animation du jeu
setInterval(draw, 10);
