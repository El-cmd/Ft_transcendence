import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { eventWebSocket } from './services/EventWsManager.js';
import { EventFetcher } from './events/EventFetcher.js';
import { router } from './Router.js';

let scene, camera, renderer, paddles, ball;
let isGamePaused = false;
let nextServer = 1; // Changed from lastScorer to nextServer, using int value
let ballLocked = false;
let ballOffset = new THREE.Vector3(); 
const leftPaddlePosition = new THREE.Vector3(0, 27, 90);
const rightPaddlePosition = new THREE.Vector3(0, 27, -90);
let localPlayer = 0; // Determine le joueur local (1)
let animationID; //pour stocker l'ID de l'animation
// let isFullyLoaded = false;


window.addEventListener("load", () => {
    setTimeout(() => {
        console.log("Forçage du redimensionnement après chargement complet");
        handleResize();
    }, 500);
});

window.addEventListener('resize', handleResize);

// Fonction pour initialiser le jeu Pong

export async function initPongGame2(players) {
    try {
        router.enableForfeitCheck();
        console.log('in initPongGame2');
        const rsp = await new EventFetcher().fetchGamePlayers();
        const data = await rsp.json();
        localPlayer = data.role;
        console.log('Local player role:', localPlayer);

        // const response = await new EventFetcher().fetchEvent(eventWebSocket.player_status.current_game_id);
        // // if (!response.ok) throw new Error("Error fetching Game Details");
        // const gameDetails = await response.json();
        // console.log('Game details : ', gameDetails);
        
        // Clean up any existing game
        if (animationID) {
            console.log('Canceling existing animation frame');
            cancelAnimationFrame(animationID);
            animationID = null;
        }
        
        // Réinitialiser lesvariables globales
        isGamePaused = false;
        nextServer = 1;
        ballLocked = false;
        ballOffset.set(0, 0, 0);
        
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
        
        // Enable forfeit check with the local player ID
        router.enableForfeitCheck();
        console.log("Démarrage de l'animation...");
        animate();
        // isFullyLoaded = true;
        eventWebSocket.game_ready = true;
        console.log('game ready', eventWebSocket.game_ready);
    } catch (error) {
        console.error("Error initializing game:", error);
    }
}

// Add this cleanup function to be called when the game component is destroyed
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


function setupScene(canvas) {
    scene = new THREE.Scene();
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const fov = 60;
    camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1, 2000);
    if (localPlayer === 1) {
        camera.position.set(0, 75, 200);
    }
    else if (localPlayer === 2) {
        camera.position.set(0, 75, -200);
    }
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
}

function handleResize() {
    if (!camera) return;
    
    // Update renderer size
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Maintain the correct camera position based on player role
    if (localPlayer === 1) {
        camera.position.set(0, 75, 200);
    } else if (localPlayer === 2) {
        camera.position.set(0, 75, -200);
    }
    
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
    addWalls();
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
    const width = 170, height = 200, depth = 20, radius = 20;
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


function addPaddles() {
    const textureLoader = new THREE.TextureLoader();
    const leftPaddleTexture = textureLoader.load('img/red_paddle.jpg');
    const rightPaddleTexture = textureLoader.load('img/green_paddle.jpg');
    const paddleGeometry = new THREE.BoxGeometry(35, 10, 7);
    const leftPaddleMaterial = new THREE.MeshStandardMaterial({
        map: leftPaddleTexture,
        emissiveIntensity: 1.5,
    });
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({
        map: rightPaddleTexture,
        emissiveIntensity: 1.5,
    });
    // Cree les paddles et applique les positions initiales
    const leftPaddle = new THREE.Mesh(paddleGeometry, leftPaddleMaterial);
    leftPaddle.position.copy(leftPaddlePosition);
    leftPaddle.castShadow = true;
    scene.add(leftPaddle);
    const rightPaddle = new THREE.Mesh(paddleGeometry, rightPaddleMaterial);
    rightPaddle.position.copy(rightPaddlePosition);
    rightPaddle.castShadow = true;
    scene.add(rightPaddle);
    return { leftPaddle, rightPaddle };
}


function addBall() {
    const textureLoader = new THREE.TextureLoader();
    const ballTexture = textureLoader.load('img/contourMetal.png');
    ballTexture.wrapS = THREE.RepeatWrapping;
    ballTexture.wrapT = THREE.RepeatWrapping;
    ballTexture.repeat.set(1, 1);
    const ballGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
        map: ballTexture, 
        emissiveMap: ballTexture,
        emissiveIntensity: 1.2,
        roughness: 0.4,
        metalness: 0.8,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 27, 0);
    ball.castShadow = true;
    scene.add(ball);
    ball.userData = { speed: { x: 0, z: 0 } };
    return ball;
}


function addWalls() {
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
    const geometry = new THREE.BoxGeometry(5, 80, 220);
    
    const leftWall = new THREE.Mesh(geometry, wallMaterial);
    leftWall.position.set(90, -5, -10);
    scene.add(leftWall);
    const rightWall = new THREE.Mesh(geometry, wallMaterial);
    rightWall.position.set(-90, -5, -10);
    scene.add(rightWall);
}


function setupPaddleMovement() {
    // Maj des mouvements uniquement pour le paddle local
    if (localPlayer === 1) {
        // Joueur 1 - paddle gauche
        paddles.leftPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "a" || event.key === "A") paddles.leftPaddle.userData.speed = -2;
            if (event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 2;
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.leftPaddle.userData.speed = 0;
        });
    } else if (localPlayer === 2) {
        // Joueur 2 - paddle droit
        paddles.rightPaddle.userData = { speed: 0 };
        document.addEventListener("keydown", (event) => {
            if (event.key === "d" || event.key === "D") paddles.rightPaddle.userData.speed = -2;
            if (event.key === "a" || event.key === "A") paddles.rightPaddle.userData.speed = 2;
            // console.log('key_down', paddles.rightPaddle.userData.speed)
        });
        document.addEventListener("keyup", (event) => {
            if (event.key === "a" || event.key === "d" || event.key === "A" || event.key === "D") paddles.rightPaddle.userData.speed = 0;
        });
    }
    // Note : Le paddle non local sera mis à jour via les messages réseau
}

export function has_ball_authority() {
    return (localPlayer === nextServer);
}

function updateBallPosition() {

    const steps = 10;
    const stepVector = new THREE.Vector3(
        ball.userData.speed.x,
        0,
        ball.userData.speed.z
    ).divideScalar(steps);

    let collisionDetected = false;
    for (let i = 1; i <= steps; i++) {
        const testPos = ball.position.clone().add(stepVector.clone().multiplyScalar(i));

        // Collision avec les murs (axe X)
        if (ball.userData.speed.x > 0 && testPos.x >= 85) {
            ball.position.x = 85;
            ball.position.y = 27;
            ball.userData.speed.x *= -1;
            collisionDetected = true;
            break;
        }
        if (ball.userData.speed.x < 0 && testPos.x <= -85) {
            ball.position.x = -85;
            ball.position.y = 27;
            ball.userData.speed.x *= -1;
            collisionDetected = true;
            break;
        }

        // Collision avec le paddle gauche (local si localPlayer===1, sinon distant)
        const left = paddles.leftPaddle;
        let leftXMin = left.position.x - 26;
        let leftXMax = left.position.x + 26;
        if (Math.abs(testPos.x - left.position.x) > 8) {
            leftXMin = left.position.x - 26;
            leftXMax = left.position.x + 26;
        }
        if (
            ball.userData.speed.z > 0 &&
            testPos.z >= left.position.z - 2 &&
            testPos.z < left.position.z + 1 &&
            testPos.x >= leftXMin &&
            testPos.x <= leftXMax
        ) {
            ball.position.z = left.position.z - 2;
            ball.userData.speed.z *= -1;
            ball.userData.speed.x += (testPos.x - left.position.x) * 0.1;
            collisionDetected = true;
            break;
        }

        // Collision avec le paddle droit (local si localPlayer===2, sinon distant)
        const right = paddles.rightPaddle;
        let rightXMin = right.position.x - 26;
        let rightXMax = right.position.x + 26;
        if (Math.abs(testPos.x - right.position.x) > 8) {
            rightXMin = right.position.x - 26;
            rightXMax = right.position.x + 26;
        }
        if (
            ball.userData.speed.z < 0 &&
            testPos.z <= right.position.z + 1 &&
            testPos.z > right.position.z - 2 &&
            testPos.x >= rightXMin &&
            testPos.x <= rightXMax
        ) {
            ball.position.z = right.position.z + 1;
            ball.userData.speed.z *= -1;
            ball.userData.speed.x += (testPos.x - right.position.x) * 0.1;
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

    ball.position.y = 27;
    
    // When ball goes out of bounds, send goal_scored message
    if (ball.position.z > 150) { 
        nextServer = 1;
        resetBall(1);
        
        // Send goal scored message to server with scoring player info
        const goalData = {
            scorer: 2, // Player 2 scored (ball went past player 1)
            victim: 1  // Player 1 was scored against
        };
        eventWebSocket.sendMessage('goal_scored', goalData);
        return;
    }
    if (ball.position.z < -150) { 
        nextServer = 2;
        resetBall(2);
        
        // Send goal scored message to server with scoring player info
        const goalData = {
            scorer: 1, // Player 1 scored (ball went past player 2)
            victim: 2  // Player 2 was scored against
        };
        eventWebSocket.sendMessage('goal_scored', goalData);
        return;
    }
}

function resetBall(nextServer) {
    isGamePaused = true;
    const ballZ = nextServer === 1 ? -85 : 85;

    // Positionnement identique sur les deux clients
    ball.position.set(0, 26, ballZ);
    ball.userData.speed = { x: 0, z: 0 };
    
    const ballLockOffsets = {
        player1: new THREE.Vector3(0, 0, -10),
        player2: new THREE.Vector3(0, 0, 10)
    };
    ballOffset.copy(ballLockOffsets[nextServer === 1 ? 'player1' : 'player2']);
    
    ballLocked = true;

    resetPaddles();
    
    // Seulement le joueur qui doit lancer la balle devrait avoir l'événement
    if ((nextServer === 1 && localPlayer === 1) || 
        (nextServer === 2 && localPlayer === 2)) {
        document.addEventListener("keydown", startBall);
    }
}

function resetPaddles() {
    // Animer le paddle gauche vers sa position par défaut
    new TWEEN.Tween(paddles.leftPaddle.position)
      .to({
          x: leftPaddlePosition.x,
          y: leftPaddlePosition.y,
          z: leftPaddlePosition.z
      }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();

    // Animer le paddle droit vers sa position par défaut
    new TWEEN.Tween(paddles.rightPaddle.position)
      .to({
          x: rightPaddlePosition.x,
          y: rightPaddlePosition.y,
          z: rightPaddlePosition.z
      }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
    
    if (has_ball_authority()) {
        sendBallUpdate();
    }
}


function startBall(event) {
    if (event.code === "Space" || event.code === "Start") {
        let directionZ = nextServer === 1 ? 2 : -2;
        let directionX = (Math.random() * 0.3 - 0.15);
        if (Math.abs(directionX) < 0.1) {
            directionX = directionX > 0 ? 0.1 : -0.1;
        }
        ball.userData.speed = { x: directionX, z: directionZ };
        ball.userData.ignoreCollisions = true;
        ball.userData.justLaunched = true; // Ajouter cet indicateur
        
        setTimeout(() => {
             ball.userData.ignoreCollisions = false;
        }, 500);
        
        isGamePaused = false;
        ballLocked = false;
        document.removeEventListener("keydown", startBall);
        
        // Envoyer immédiatement l'état pour que le lancement soit synchronisé
        // sendGameState();
    }
}


function updatePaddlePositions() {
    // if (!has_ball_authority()) {
    //     return
    // }
	// Mise à jour du paddle local
	if (localPlayer === 1) {
		paddles.leftPaddle.position.x += paddles.leftPaddle.userData.speed;
		paddles.leftPaddle.position.x = Math.max(-63, Math.min(63, paddles.leftPaddle.position.x));
		paddles.leftPaddle.position.y = 27;
        if (paddles.leftPaddle.userData.speed !== 0) {
            console.log('sending paddle update');
            sendPaddleUpdate();
        }
	} else if (localPlayer === 2) {
		paddles.rightPaddle.position.x += paddles.rightPaddle.userData.speed;
		paddles.rightPaddle.position.x = Math.max(-69, Math.min(69, paddles.rightPaddle.position.x));
		paddles.rightPaddle.position.y = 27;
        if (paddles.rightPaddle.userData.speed !== 0) {
            console.log('sending paddle update');
            sendPaddleUpdate();
        }
	}

	if (ballLocked) {
		let activePaddle;
		if (nextServer === 1) {
			activePaddle = paddles.leftPaddle;
		} else if (nextServer === 2) {
			activePaddle = paddles.rightPaddle;
		}
		if (activePaddle) {
			ball.position.copy(activePaddle.position).add(ballOffset);
		}
        sendBallUpdate();
	}
}

// Add this new function to handle server-sent score updates
export function updateScoreBoardFromServer(data) {
    // Convert payload data to match our score format
    const serverScores = data.payload;
    
    const player1Score = document.getElementById("player1-score");
    const player2Score = document.getElementById("player2-score");
    console.log('updating scores:', serverScores);
    if (!!player1Score && !!player2Score) {
        player1Score.innerText = serverScores.player1;
        player2Score.innerText = serverScores.player2;
    }
}

function animate() {
    console.log('in animate pong2');
    animationID = requestAnimationFrame(animate);
    TWEEN.update();
    updatePaddlePositions();
    
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


function sendPaddleUpdate() {
    const paddleState = {
        paddle1: paddles.leftPaddle.position.x,
        paddle2: paddles.rightPaddle.position.x   
    };
    eventWebSocket.sendMessage('paddle_update', paddleState);

}

export function paddleStateReceived(data) {
    const paddleState = data;
    
    console.log('receiving paddle state:', paddleState);
    if (paddleState.paddle1 && localPlayer === 2) {
        paddles.leftPaddle.position.x = paddleState.paddle1;
    }
    if (paddleState.paddle2 && localPlayer === 1) {
        paddles.rightPaddle.position.x = paddleState.paddle2;
    }
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
    console.log('Received ball update:', data);

    ball.position.x = data.x;
    ball.position.z = data.z;
    ball.userData.speed.x = data.speedX;
    ball.userData.speed.z = data.speedZ;
    ballLocked = data.ballLocked;
    ball.position.y = 27;
}


let previousBallState = {};
function sendBallUpdate() {
    // if (!isFullyLoaded)
    //     return ;

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
        // if (Date.now() - previousBallState.timestamp < 5 && !ballLocked) {

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
    console.log('data sent :', ballState);
}

function setScoreBoard(players) {
    let player;
    console.log('players:', players);
    for (let i = 0; i < players.length; i++)
    {
        player = document.getElementById(`player${i + 1}-score`);
        player.innerText = `${players[i].userevent_name} : 0`;
    }
}
    