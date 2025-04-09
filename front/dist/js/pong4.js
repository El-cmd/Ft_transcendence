import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { eventWebSocket } from './services/EventWsManager.js';
import { EventFetcher } from './events/EventFetcher.js';
import { router } from './Router.js';

let scene, renderer, paddles, ball, camera;
let isGamePaused = false;

let nextServer = 1; // replaces lastScorer, using int instead of string

let lastTouch = null;
let ballLocked = false;
let ballOffset = new THREE.Vector3(); 
const leftPaddlePosition = new THREE.Vector3(0, 35, 100);
const rightPaddlePosition = new THREE.Vector3(0, 35, -100);
const thirdPaddlePosition = new THREE.Vector3(-100, 30, 0);
const fourthPaddlePosition = new THREE.Vector3(100, 30, 0);
let localPlayer = 0; 
let currentPlayers = [1, 2, 3, 4];
let walls = [];
let animationID; //pour stocker l'ID de l'animatio

window.addEventListener("load", () => {
    // todo : return si pas sur une game
    setTimeout(() => {
        console.log("Forçage du redimensionnement après chargement complet");
        handleResize();
    }, 500);
});

window.addEventListener('resize', handleResize);

export async function initPongGame4(players) {
    try {
        router.enableForfeitCheck();
        console.log('in initPongGame4');
        const rsp = await new EventFetcher().fetchGamePlayers();
        const data = await rsp.json();
        localPlayer = data.role;
        console.log('Local player role:', localPlayer);

        // Clean up any existing game
        if (animationID) {
            console.log('Canceling existing animation frame');
            cancelAnimationFrame(animationID);
            animationID = null;
        }

        // Réinitialiser les variables globales
        isGamePaused = false;
        nextServer = 1;
        ballLocked = false;
        ballOffset.set(0, 0, 0);
        currentPlayers = [1, 2, 3, 4];
        walls = [];
        
        console.log("Initialisation du Pong Game");

        const canvas = document.getElementById("pongCanvas");
        if (!canvas) {
            console.error("Canvas introuvable. Annulation de l'initialisation.");
            return;
        }

        console.log("Canvas trouvé, on continue l'initialisation...");

        setupScene(canvas);
        setupLights();
        setupObjects();
        setupPaddleMovement(); 
        resetBall(nextServer);
        setScoreBoard(players);

        // First remove any existing event listeners to prevent duplicates
        window.removeEventListener("resize", handleResize);
        window.addEventListener("resize", handleResize);

        console.log("Démarrage de l'animation...");
        animate();
        eventWebSocket.game_ready = true;
    }
    catch (error) {
        console.error("Erreur lors de l'initialisation du Pong Game 4", error);
    }
}

function resizeCanvasToDisplaySize() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

function setLocalPlayerCamera() {
    if (localPlayer === 1) {
        camera.position.set(0, 95, 220);
    } else if (localPlayer === 2) {
        camera.position.set(0, 95, -220);
    } else if (localPlayer === 3) {
        camera.position.set(-220, 100, 0);
    } else if (localPlayer === 4) {
        camera.position.set(220, 100, 0);
    }
}

function setupScene(canvas) {
    scene = new THREE.Scene();
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const fov = 60;
    camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1, 2000);
    
    // config cam du player local
    setLocalPlayerCamera(); 
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Configuration du renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}


function handleResize() {
    if (!camera) return;

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    
    // Mettre à jour le renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Maintain the correct camera position based on player role
    setLocalPlayerCamera();
    
    // Make sure camera is looking at the center
    camera.lookAt(new THREE.Vector3(0, 0, 0));
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
}

function setupObjects() {
    addFloor();
    paddles = addPaddles();
    ball = addBall();
}


function addFloor() {
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load('img/metal.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        side: THREE.DoubleSide,
        roughness: 0.3,
    });
    const width = 220, height = 220, depth = 20, radius = 20;
    const roundedShape = new THREE.Shape();
    roundedShape.moveTo(-width / 2 + radius, -height / 2);
    roundedShape.lineTo(width / 2 - radius, -height / 2);
    roundedShape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    roundedShape.lineTo(width / 2, height / 2 - radius);
    roundedShape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    roundedShape.lineTo(-width / 2 + radius, height / 2);
    roundedShape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    roundedShape.lineTo(-width / 2, -height / 2 + radius);
    roundedShape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
    const extrudeSettings = { depth: depth, bevelEnabled: false, steps: 1 };
    const floorGeometry = new THREE.ExtrudeGeometry(roundedShape, extrudeSettings);
    floorGeometry.computeBoundingBox();
    const max = floorGeometry.boundingBox.max, min = floorGeometry.boundingBox.min;
    const uvAttribute = floorGeometry.attributes.position;
    const uvs = [];
    for (let i = 0; i < uvAttribute.count; i++) {
        const x = uvAttribute.getX(i), y = uvAttribute.getY(i);
        uvs.push((x - min.x) / (max.x - min.x));
        uvs.push((y - min.y) / (max.y - min.y));
    }
    floorGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    floor.receiveShadow = true;
    scene.add(floor);
    const edgeGeometry = new THREE.EdgesGeometry(floorGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCCC, linewidth: 2 });
    const floorEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    floorEdges.rotation.x = -Math.PI / 2;
    floorEdges.position.y = -3.01;
    scene.add(floorEdges);
}


// Dans addPaddles(), initialisation des userData
function addPaddles() {
    const textureLoader = new THREE.TextureLoader();

    const leftPaddleTexture = textureLoader.load('img/red_paddle.jpg');
    const rightPaddleTexture = textureLoader.load('img/green_paddle.jpg');
    const thirdPaddleTexture = textureLoader.load('img/purple_paddle.jpg');
    const fourthPaddleTexture = textureLoader.load('img/blue_paddle.jpg');

    // Pour les joueurs 1 et 2 (paddles horizontaux)
    const paddleGeometry = new THREE.BoxGeometry(40, 10, 10);
    // Pour les joueurs 3 et 4 (paddles verticaux)
    const paddleGeometry34 = new THREE.BoxGeometry(10, 10, 40);

    const leftPaddleMaterial = new THREE.MeshStandardMaterial({
        map: leftPaddleTexture,
        emissiveIntensity: 1.5,
    });
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({
        map: rightPaddleTexture,
        emissiveIntensity: 1.5,
    });
    const thirdPaddleMaterial = new THREE.MeshStandardMaterial({
        map: thirdPaddleTexture,
        emissiveIntensity: 1.5,
    });
    const fourthPaddleMaterial = new THREE.MeshStandardMaterial({
        map: fourthPaddleTexture,
        emissiveIntensity: 1.5,
    });

    const leftPaddle = new THREE.Mesh(paddleGeometry, leftPaddleMaterial);
    leftPaddle.position.copy(leftPaddlePosition);
    leftPaddle.castShadow = true;
    // Initialisation userData
    leftPaddle.userData = { speed: 0 };

    scene.add(leftPaddle);

    const rightPaddle = new THREE.Mesh(paddleGeometry, rightPaddleMaterial);
    rightPaddle.position.copy(rightPaddlePosition);
    rightPaddle.castShadow = true;
    rightPaddle.userData = { speed: 0 };

    scene.add(rightPaddle);

    const thirdPaddle = new THREE.Mesh(paddleGeometry34, thirdPaddleMaterial);
    thirdPaddle.position.copy(thirdPaddlePosition);
    thirdPaddle.castShadow = true;
    thirdPaddle.userData = { speed: 0 };

    scene.add(thirdPaddle);

    const fourthPaddle = new THREE.Mesh(paddleGeometry34, fourthPaddleMaterial);
    fourthPaddle.position.copy(fourthPaddlePosition);
    fourthPaddle.castShadow = true;
    fourthPaddle.userData = { speed: 0 };

    scene.add(fourthPaddle);

    return { leftPaddle, rightPaddle, thirdPaddle, fourthPaddle };
}

function addBall() {
    const textureLoader = new THREE.TextureLoader();
    const ballTexture = textureLoader.load('img/contourMetal.png');
    ballTexture.wrapS = THREE.RepeatWrapping;
    ballTexture.wrapT = THREE.RepeatWrapping;
    ballTexture.repeat.set(1, 1);
    const ballGeometry = new THREE.SphereGeometry(4, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
        map: ballTexture, 
        emissiveMap: ballTexture,
        emissiveIntensity: 1.2,
        roughness: 0.4,
        metalness: 0.8,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 28, 0);
    ball.castShadow = true;
    scene.add(ball);
    ball.userData = { speed: { x: 0, z: 0 } };
    return ball;
}

function setupPaddleMovement() {    
    // Maj des mouvements uniquement pour le paddle local

    if (localPlayer === 1) {
        // Joueur 1 
        paddles.leftPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D")
                console.log("key ", event.key, " pressed by player ", localPlayer);
            if (event.key === "a" || event.key === "A") paddles.leftPaddle.userData.speed = -2;
            if (event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 2;
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.leftPaddle.userData.speed = 0;
        });
    } else if (localPlayer === 2) {
        // Joueur 2 
        paddles.rightPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D")
                console.log("key ", event.key, " pressed by player ", localPlayer);
            if (event.key === "a" || event.key === "A") paddles.rightPaddle.userData.speed = 2;
            if (event.key === "d" || event.key === "D") paddles.rightPaddle.userData.speed = -2;
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.rightPaddle.userData.speed = 0;
        });
    } else if (localPlayer === 3) {
        // Joueur 3
        paddles.thirdPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D")
                console.log("key ", event.key, " pressed by player ", localPlayer);
            if (event.key === "a" || event.key === "A") paddles.thirdPaddle.userData.speed = -2; // tocheck
            if (event.key === "d" || event.key === "D") paddles.thirdPaddle.userData.speed = 2; // tocheck
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.thirdPaddle.userData.speed = 0;
        });
    } else if (localPlayer === 4) {
        // Joueur 4 
        paddles.fourthPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D")
                console.log("key ", event.key, " pressed by player ", localPlayer);
            if (event.key === "a" || event.key === "A") paddles.fourthPaddle.userData.speed = 2; // tocheck
            if (event.key === "d" || event.key === "D") paddles.fourthPaddle.userData.speed = -2; // tocheck
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.fourthPaddle.userData.speed = 0;
        });
    }

    // Note : Le paddle non local sera mis à jour via les messages réseau

}

function checkForWallsCollisions(testPos)
{
    if (walls.includes(1))
    {
        if (ball.userData.speed.z > 0 && testPos.z >= 95) {
            ball.position.z = 95;
            ball.position.y = 28;
            ball.userData.speed.z *= -1;
            return true;
        }
    }
    if (walls.includes(2))
    {
        if (ball.userData.speed.z < 0 && testPos.z <= -95) {
            ball.position.z = -95;
            ball.position.y = 28;
            ball.userData.speed.z *= -1;
            return true;
        }
    }
    if (walls.includes(3))
    {
        if (ball.userData.speed.x < 0 && testPos.x <= -95) {
            ball.position.x = -95;
            ball.position.y = 28;
            ball.userData.speed.x *= -1;
            return true;
        }
    }
    if (walls.includes(4))
    {
        if (ball.userData.speed.x > 0 && testPos.x >= 95) {
            ball.position.x = 95;
            ball.position.y = 28;
            ball.userData.speed.x *= -1;
            return true;
        }
    }

    return false;
}

function checkForPaddle1Collision(testPos) {
    const paddle = paddles.leftPaddle;
    let xMin = paddle.position.x - 22;
    let xMax = paddle.position.x + 22;
    if (
        ball.userData.speed.z > 0 &&
        testPos.z >= paddle.position.z - 2 &&
        testPos.z < paddle.position.z + 1 &&
        testPos.x >= xMin &&
        testPos.x <= xMax
    ) {
        ball.position.z = paddle.position.z - 2;
        ball.userData.speed.z *= -1;
        ball.userData.speed.x += (testPos.x - paddle.position.x) * 0.1;
        lastTouch = "player1";
        console.log(`Collision avec paddle joueur 1, lastTouch = ${lastTouch}`);
        return true;
    }
    return false
}

function checkForPaddle2Collision(testPos)
{
    const paddle = paddles.rightPaddle;
    let xMin = paddle.position.x - 22;
    let xMax = paddle.position.x + 22;
    if (
        ball.userData.speed.z < 0 &&
        testPos.z <= paddle.position.z + 1 &&
        testPos.z > paddle.position.z - 2 &&
        testPos.x >= xMin &&
        testPos.x <= xMax
    ) {
        ball.position.z = paddle.position.z + 1;
        ball.userData.speed.z *= -1;
        ball.userData.speed.x += (testPos.x - paddle.position.x) * 0.1;
        lastTouch = "player2";
        console.log(`Collision avec paddle joueur 2, lastTouch = ${lastTouch}`);
        return true;
    }
    return false;
}

function checkForPaddle3Collision(testPos)
{
    const paddle = paddles.thirdPaddle;
    const zMin = paddle.position.z - 22;
    const zMax = paddle.position.z + 22;

    if (
        ball.userData.speed.x < 0 &&
        testPos.x <= paddle.position.x + 1 &&
        testPos.x > paddle.position.x - 2 && 
        testPos.z >= zMin && testPos.z <= zMax 
    ) {
        ball.position.x = paddle.position.x + 1;
        ball.userData.speed.x *= -1;
        ball.userData.speed.z += (testPos.z - paddle.position.z) * 0.1;
        lastTouch = "player3";
        console.log(`Collision avec paddle joueur 3, lastTouch = ${lastTouch}`);
        return true;
    }
    return false;
}

function checkForPaddle4Collision(testPos)
{
    const paddle = paddles.fourthPaddle;
    const zMin = paddle.position.z - 22;
    const zMax = paddle.position.z + 22;

    if (
        ball.userData.speed.x > 0 &&           
        testPos.x >= paddle.position.x - 2 &&                  
        testPos.x < paddle.position.x + 1 &&                   
        testPos.z >= zMin && testPos.z <= zMax   
    ) {
        ball.position.x = paddle.position.x - 2;
        ball.userData.speed.x *= -1;
        ball.userData.speed.z += (testPos.z - paddle.position.z) * 0.1;
        lastTouch = "player4";
        console.log(`Collision avec paddle joueur 4, lastTouch = ${lastTouch}`);
        return true;
    }
    return false;
}

function updateBallPosition() {
	// if (ballLocked) return; 
    if (isGamePaused) return;
    console.log("État actuel: lastTouch =", lastTouch);

    const steps = 10;
    const stepVector = new THREE.Vector3(
        ball.userData.speed.x,
        0,
        ball.userData.speed.z
    ).divideScalar(steps);

    let collisionDetected = false;
    for (let i = 1; i <= steps; i++) {
        const testPos = ball.position.clone().add(stepVector.clone().multiplyScalar(i));

        if (checkForWallsCollisions(testPos)) {
            collisionDetected = true;
            break ;
        }

        // Collision avec le paddle gauche (local si localPlayer===1, sinon distant)
        if (currentPlayers.includes(1) && checkForPaddle1Collision(testPos)) {
            collisionDetected = true;
            break;
        }
        if (currentPlayers.includes(2) && checkForPaddle2Collision(testPos)) {
            collisionDetected = true;
            break;
        }
        if (currentPlayers.includes(3) && checkForPaddle3Collision(testPos)) {
            collisionDetected = true;
            break;
        }
        if (currentPlayers.includes(4) && checkForPaddle4Collision(testPos)) {
            collisionDetected = true;
            break;
        }
    }
    if (!collisionDetected) {
        ball.position.add(new THREE.Vector3(ball.userData.speed.x, 0, ball.userData.speed.z));
    }

	// Normalisation de la vitesse pour maintenir une vitesse constante
    const desiredSpeed = 3; // Vitesse constante souhaitee
    const currentSpeed = Math.sqrt(ball.userData.speed.x ** 2 + ball.userData.speed.z ** 2);
    if (currentSpeed !== 0) {
        ball.userData.speed.x = (ball.userData.speed.x / currentSpeed) * desiredSpeed;
        ball.userData.speed.z = (ball.userData.speed.z / currentSpeed) * desiredSpeed;
    }

    ball.position.y = 28;

    // When ball goes out of bounds, send goal_scored message
    if (ball.position.z > 120 || ball.position.z < -120 || ball.position.x < -120 || ball.position.x > 120)
    {
        const scorer = lastTouch ? lastTouch[lastTouch.length - 1] : null;
        
        if (ball.position.z > 120) {
            console.log(`Balle dépassant joueur 1. lastTouch avant attribution: ${lastTouch}. scorer : ${scorer}`);
            if (lastTouch && lastTouch !== "player1") {
                console.log(`Point attribué à ${lastTouch}`);
                // Send goal scored message to server with scoring player info
                const goalData = {
                    scorer: scorer, 
                    victim: 1  
                };
                eventWebSocket.sendMessage('goal_scored', goalData);
            }
            nextServer = 1;
            resetBall(nextServer);  
            return;
        }
        if (ball.position.z < -120) {
            console.log(`Balle dépassant joueur 2. lastTouch avant attribution: ${lastTouch}`);
            if (lastTouch && lastTouch !== "player2") {
                console.log(`Point attribué à ${lastTouch}`);
                // Send goal scored message to server with scoring player info
                const goalData = {
                    scorer: scorer, 
                    victim: 2  
                };
                console.log('sending goal scored message : ', goalData);
                eventWebSocket.sendMessage('goal_scored', goalData);
            }
            nextServer = 2;
            resetBall(nextServer);
            return;
        }
        if (ball.position.x < -120) { 
            // La balle dépasse par le côté gauche : le défenseur est player4.
            console.log(`Balle dépassant joueur 3. lastTouch avant attribution: ${lastTouch}`);
            if (lastTouch && lastTouch !== "player3") {
                console.log(`Point attribué à ${lastTouch}`);
                // Send goal scored message to server with scoring player info
                const goalData = {
                    scorer: scorer, 
                    victim: 3  
                };
                eventWebSocket.sendMessage('goal_scored', goalData);
            }
            nextServer = 3;
            resetBall(nextServer);
            return;
        }
        if (ball.position.x > 120) { 
            // La balle dépasse par le côté droit : le défenseur est player3.
            console.log(`Balle dépassant joueur 4. lastTouch avant attribution: ${lastTouch}`);
            if (lastTouch && lastTouch !== "player4") {
                console.log(`Point attribué à ${lastTouch}`);
                // Send goal scored message to server with scoring player info
                const goalData = {
                    scorer: scorer, 
                    victim: 4
                };
                eventWebSocket.sendMessage('goal_scored', goalData);
            }
            nextServer = 4;
            resetBall(nextServer);
            return;
        }
    }
}

function resetBall(nextServer) {
    isGamePaused = true;

    console.log('resetting ball for nextServer ', nextServer);
    let activePaddle;
    if (nextServer === 1) {
        // Pour le joueur 1 (paddle gauche en Z positif)
        ball.position.set(0, 28, 91);
		activePaddle = paddles.leftPaddle;
    } else if (nextServer === 2) {
        // Pour le joueur 2 (paddle droit en Z négatif)
        ball.position.set(0, 28, -91);
		activePaddle = paddles.rightPaddle;
    } else if (nextServer === 4) {
        // Pour le joueur 3 (paddle third à droite) : place la balle légèrement à gauche du paddle
        ball.position.set(91, 28, 0);
		activePaddle = paddles.fourthPaddle;
    } else if (nextServer === 3) {
        // Pour le joueur 4 (paddle fourth à gauche) : place la balle légèrement à droite du paddle
        ball.position.set(-91, 28, 0);
		activePaddle = paddles.thirdPaddle;
    }
    ball.userData.speed = { x: 0, z: 0 };
    
	const ballLockOffsets = {
		player1: new THREE.Vector3(0, 0, -10),   // Pour que la balle soit 10 unités devant le paddle de player1
		player2: new THREE.Vector3(0, 0, 10),  // Pour player2
		player3: new THREE.Vector3(10, 0, 0),   // Pour player3
		player4: new THREE.Vector3(-10, 0, 0)   // Pour player4
	  };
	  

	if (activePaddle) {
        const player = 'player' + nextServer;
		ballOffset.copy(ballLockOffsets[player]);
	}
	  
	ballLocked = true;
    lastTouch = null;

    resetPaddles();  // calls sendBallUpdate()

    // Seulement le joueur qui doit lancer la balle devrait avoir l'événement
    if ((nextServer === 1 && localPlayer === 1) || 
        (nextServer === 2 && localPlayer === 2) ||
        (nextServer === 3 && localPlayer === 3) ||
        (nextServer === 4 && localPlayer === 4)) {
        document.addEventListener("keydown", startBall);
    }
}

function resetPaddles() {
    if (currentPlayers.includes(1)) {
        new TWEEN.Tween(paddles.leftPaddle.position)
          .to({ x: leftPaddlePosition.x, y: leftPaddlePosition.y, z: leftPaddlePosition.z }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
    }
  
    if (currentPlayers.includes(2)) {
        new TWEEN.Tween(paddles.rightPaddle.position)
          .to({ x: rightPaddlePosition.x, y: rightPaddlePosition.y, z: rightPaddlePosition.z }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
    }

    if (currentPlayers.includes(3)) {
        new TWEEN.Tween(paddles.thirdPaddle.position)
          .to({ x: thirdPaddlePosition.x, y: thirdPaddlePosition.y, z: thirdPaddlePosition.z }, 1000)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
    }

    if (currentPlayers.includes(4)) {
        new TWEEN.Tween(paddles.fourthPaddle.position)
        .to({ x: fourthPaddlePosition.x, y: fourthPaddlePosition.y, z: fourthPaddlePosition.z }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    }

    if (has_ball_authority()) {
        sendBallUpdate();
    }
}


function startBall(event) {
    if (event.code === "Space" || event.code === "Start") {
        console.log(`startBall: lastTouch avant démarrage = ${lastTouch}`);
		let directionX = 0, directionZ = 0;
        if (nextServer === 1) {
            console.log("startball - player1");
            // Pour player1 (haut), la balle part vers le bas sur l'axe Z
            directionZ = 2;
            directionX = (Math.random() * 0.3 - 0.15);
        } else if (nextServer === 2) {
            console.log("startball - player2");
            // Pour player2 (bas), la balle part vers le haut sur l'axe Z (inverse)
            directionZ = -2;
            directionX = (Math.random() * 0.3 - 0.15);
        } else if (nextServer === 3) {
            console.log("startball - player3");
            // Pour player3 (à droite), la balle doit partir vers la gauche sur l'axe X
            directionX = -2;
            directionZ = (Math.random() * 0.3 - 0.15);
        } else if (nextServer === 4) {
            console.log("startball - player4");
            // Pour player4 (à gauche), la balle doit partir vers la droite sur l'axe X
            directionX = 2;
            directionZ = (Math.random() * 0.3 - 0.15);
        }

        // S'assurer que la vitesse minimale soit respectée
        if (Math.abs(directionX) < 0.1) {
            directionX = directionX > 0 ? 0.1 : -0.1;
        }
        if (Math.abs(directionZ) < 0.1) {
            directionZ = directionZ > 0 ? 0.1 : -0.1;
        }

        // ?????
        // Si personne n'a touché la balle pendant la pause, on considère que c'est le serveur
        if (!lastTouch) {
            lastTouch = nextServer;
        }

        ball.userData.speed = { x: directionX, z: directionZ };
        ball.userData.ignoreCollisions = true;
        ball.userData.justLaunched = true; // rajouté mais jsp si c utile

        setTimeout(() => {
            ball.userData.ignoreCollisions = false;
        }, 500);

        isGamePaused = false;
        ballLocked = false;

        document.removeEventListener("keydown", startBall);
    }
}

function updatePaddlePositions() {
    // Mise à jour du paddle local
    if (localPlayer === 1) {
        // if (paddles.leftPaddle.userData.speed === 0) return ;
        if (paddles.leftPaddle.userData.speed !== 0)
            console.log('Paddle ', localPlayer, ' has speed : ', paddles.leftPaddle.userData.speed);
		paddles.leftPaddle.position.x += paddles.leftPaddle.userData.speed;
        paddles.leftPaddle.position.x = Math.max(-95, Math.min(95, paddles.leftPaddle.position.x));
        paddles.leftPaddle.position.y = 27;
        if (paddles.leftPaddle.userData.speed !== 0) {
            // console.log('sending paddle update');
            sendPaddleUpdate();
        }
	} else if (localPlayer === 2) {
        if (paddles.rightPaddle.userData.speed !== 0)
            console.log('Paddle ', localPlayer, ' has speed : ', paddles.rightPaddle.userData.speed);
		paddles.rightPaddle.position.x += paddles.rightPaddle.userData.speed;
        paddles.rightPaddle.position.x = Math.max(-95, Math.min(95, paddles.rightPaddle.position.x));
        paddles.rightPaddle.position.y = 27;
        if (paddles.rightPaddle.userData.speed !== 0) {
            // console.log('sending paddle update');
            sendPaddleUpdate();
        }
	} else if (localPlayer === 3){
        if (paddles.thirdPaddle.userData.speed !== 0)
            console.log('Paddle ', localPlayer, ' has speed : ', paddles.thirdPaddle.userData.speed);
		paddles.thirdPaddle.position.z += paddles.thirdPaddle.userData.speed;
        paddles.thirdPaddle.position.z = Math.max(-95, Math.min(95, paddles.thirdPaddle.position.z));
        paddles.thirdPaddle.position.y = 27;

        if (paddles.thirdPaddle.userData.speed !== 0) {
            // console.log('sending paddle update');
            sendPaddleUpdate();
        }
	} else if (localPlayer === 4) {
        if (paddles.fourthPaddle.userData.speed !== 0)
            console.log('Paddle ', localPlayer, ' has speed : ', paddles.fourthPaddle.userData.speed);
		paddles.fourthPaddle.position.z += paddles.fourthPaddle.userData.speed;
        paddles.fourthPaddle.position.z = Math.max(-95, Math.min(95, paddles.fourthPaddle.position.z));
        paddles.fourthPaddle.position.y = 27;

        if (paddles.fourthPaddle.userData.speed !== 0) {
            // console.log('sending paddle update');
            sendPaddleUpdate();
        }
	}

	if (ballLocked) {
		let activePaddle;
		if (nextServer === 1) {
			activePaddle = paddles.leftPaddle;
		} else if (nextServer === 2) {
			activePaddle = paddles.rightPaddle;
		} else if (nextServer === 3) {
			activePaddle = paddles.thirdPaddle;
		} else if (nextServer === 4) {
			activePaddle = paddles.fourthPaddle;
		}

		const ball_x = ball.position.x;
        const ball_z = ball.position.z;
		if (activePaddle) {
			ball.position.copy(activePaddle.position).add(ballOffset);
		}
        if (ball_x !== ball.position.x || ball_z !== ball.position.z) {
            sendBallUpdate();
        }
	}		
}

function sendPaddleUpdate() {
    const paddleState = {
        paddle1: currentPlayers.includes(1) ? paddles.leftPaddle.position.x : null,
        paddle2: currentPlayers.includes(2) ? paddles.rightPaddle.position.x : null,
        paddle3: currentPlayers.includes(3) ? paddles.thirdPaddle.position.z  : null,
        paddle4: currentPlayers.includes(4) ? paddles.fourthPaddle.position.z : null
    };
    eventWebSocket.sendMessage('paddle_update', paddleState);
    console.log('local player ', localPlayer,' sending paddle state:', paddleState); // eventWebSocket.get_status()

}

export function cleanup() {
    console.log("Cleaning up Pong game resources");
    
    // Remove event listeners
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("keydown", startBall);
    
    // Cancel animation frame
    if (animationID) {
        cancelAnimationFrame(animationID);
        animationID = null;
    } else 
        console.log('in cleanup(), animationID not found');
    
    // Disable forfeit check
    
    console.log("Pong game cleanup complete");
}

export function paddleStateReceived(data) {
    const paddleState = data;
    
    console.log('receiving paddle state:', paddleState);
    if (paddleState.paddle1 && localPlayer !== 1) {
        paddles.leftPaddle.position.x = paddleState.paddle1;
    }
    if (paddleState.paddle2 && localPlayer !== 2) {
        paddles.rightPaddle.position.x = paddleState.paddle2;
    }
    if (paddleState.paddle3 && localPlayer !== 3) {
        paddles.thirdPaddle.position.z = paddleState.paddle3;
    }
    if (paddleState.paddle4 && localPlayer !== 4) {
        paddles.fourthPaddle.position.z = paddleState.paddle4;
    }
}

export function has_ball_authority() {
    return (localPlayer === nextServer);
}

// New function to handle next server updates from the server
export function nextServerUpdate(data) {
    console.log('Received nextServer update:', data);
    nextServer = data;
    // Reset the ball with the new server
    resetBall(nextServer);
}

// Update this function to properly set the ball position
export function ballUpdate(data) {
    if (has_ball_authority()) {
        return;
    } 
    // console.log('Received ball update:', data); // ln

    ball.position.x = data.x;
    ball.position.z = data.z;
    ball.userData.speed.x = data.speedX;
    ball.userData.speed.z = data.speedZ;
    ballLocked = data.ballLocked;
    ball.position.y = 28;
}

let previousBallState = {};

function sendBallUpdate() {
    // if type is ball_update, check if the ball update is newer than the last processed update and if position changes
    
    const timestamp = Date.now();
    if (previousBallState.length !== 0) {
        if (ball.position.x === previousBallState.x 
            && ball.position.z === previousBallState.z
            && ball.userData.speed.x === previousBallState.speedX
            && ball.userData.speed.z === previousBallState.speedZ
            && ballLocked === previousBallState.ballLocked) {
            return;
        } 
        // if (Date.now() - previousBallState.timestamp < 30 && !ballLocked) {
        //     return;
        // }
    }
    const ballState = {
        'x': ball.position.x,
        'z': ball.position.z,
        'speedX': ball.userData.speed.x,
        'speedZ': ball.userData.speed.z,
        'ballLocked':  ballLocked,
        'timestamp': timestamp,
    };
    previousBallState = ballState;
    eventWebSocket.sendMessage('ball_update', ballState);
    // console.log('data sent :', ballState); // ln
}

// Add this new function to handle server-sent score updates
export function updateScoreBoardFromServer(data) {
    // Convert payload data to match our score format
    const serverScores = data.payload;
    console.log('serverScores fetched from server : ', serverScores);
    
    const player1Score = document.getElementById("player1-score");
    const player2Score = document.getElementById("player2-score");
    const player3Score = document.getElementById("player3-score");
    const player4Score = document.getElementById("player4-score");
    if (player1Score && player2Score && player3Score && player4Score) {
        player1Score.innerText = serverScores.player1;
        player2Score.innerText = serverScores.player2;
        player3Score.innerText = serverScores.player3;
        player4Score.innerText = serverScores.player4;
    }    
}


function animate() {
    console.log('in animate pong4');
    animationID = requestAnimationFrame(animate);
    TWEEN.update();
    updatePaddlePositions(); // calls sendBallUpdate() 
    
    // Store current position to detect changes
    const ball_x = ball.position.x;
    const ball_z = ball.position.z;
    
    // Authority player calculates physics
    if (has_ball_authority()) {
        updateBallPosition();
        if (ball_x !== ball.position.x || ball_z !== ball.position.z) {
            sendBallUpdate();
        }
    }
    
    resizeCanvasToDisplaySize();
    renderer.render(scene, camera);
}

function createWall(axis) {
    const textureLoader = new THREE.TextureLoader();
    const contourTexture = textureLoader.load('img/metal.jpg');
    contourTexture.wrapS = THREE.RepeatWrapping;
    contourTexture.wrapT = THREE.RepeatWrapping;
    contourTexture.repeat.set(4, 4);
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: contourTexture,
        side: THREE.DoubleSide,
        roughness: 0.3,
    });
    let geometry;
    if (axis === 3 || axis === 4)
        geometry = new THREE.BoxGeometry(5, 80, 220);
    else 
    geometry = new THREE.BoxGeometry(220, 80, 5);
    const wall = new THREE.Mesh(geometry, wallMaterial);
    return wall
}

/**
 * @param {*} playerID 
 * Called when a 'player_gave_up' websocket message is received
 *      - add wall to list of walls for each players
 *      OR : keep track of the ID of players currently in the game. 
 */
export function replacePlayerByWall(playerID) {

    console.log('replacing player ', playerID, ' by wall');
    
    if (!currentPlayers.length || !currentPlayers.find(player => player === playerID))
        return ; // player already not in game anymore, or just no more players (should not happen)

    const wall = createWall(playerID);
    if (playerID === 1) 
        wall.position.set(0, 0, 100);
    else if (playerID === 2)
        wall.position.set(0, 0, -100);
    else if (playerID === 3)
        wall.position.set(-100, 0, 0);
    else if (playerID === 4)
        wall.position.set(100, 0, 0);

    // remove paddle from paddles list
    // remove paddle from scene

    let paddle;
    if (playerID === 1) 
        paddle = paddles.leftPaddle;
    else if (playerID === 2)
        paddle = paddles.rightPaddle;
    else if (playerID === 3)
        paddle = paddles.thirdPaddle;
    else if (playerID === 4)
        paddle = paddles.fourthPaddle;

    console.log('paddles before : ', paddles);

    // Remove from scene
    scene.remove(paddle);
    
    // Dispose of geometry and material
    if (paddle.geometry) paddle.geometry.dispose();
    if (paddle.material) {
        if (paddle.material.map) paddle.material.map.dispose();
        paddle.material.dispose();
    }

    // Delete reference from the paddles object
    if (playerID === 1) 
        delete paddles.leftPaddle;
    else if (playerID === 2)
        delete paddles.rightPaddle;
    else if (playerID === 3)
        delete paddles.thirdPaddle;
    else if (playerID === 4)
        delete paddles.fourthPaddle;
    console.log('paddles after : ', paddles);

    scene.add(wall);
    const playerIndex = currentPlayers.indexOf(playerID);

    currentPlayers.splice(playerIndex, 1);
    walls.push(playerID);
    console.log('Players still in game : ', currentPlayers, '. Walls in place : ', walls);

    if (nextServer === playerID) {
        nextServer = currentPlayers.at(0);
        resetBall(nextServer);
        sendBallUpdate();
        console.log('Current nextServer gave up. New nextServer : ', nextServer);

    }
    if (lastTouch === playerID) { // reset lastTouch
        lastTouch = null;
        console.log('Current lastTouch gave up. New lastTouch : ', lastTouch);
    }
}

function setScoreBoard(players) {
    let player;
    for (let i = 0; i < players.length; i++)
    {
        player = document.getElementById(`player${i + 1}-score`);
        player.innerText = `${players[i].userevent_name} : 0`;
    }
}