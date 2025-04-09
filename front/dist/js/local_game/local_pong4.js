import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';

let scene, renderer, paddles, ball;
let camera1, camera2;
let scores = { player1: 0, player2: 0, player3: 0, player4: 0 };
// let cornerWalls = [];
let isGamePaused = false;
let lastScorer = 'player1';
let lastTouch = null;
let ballLocked = false;
let ballOffset = new THREE.Vector3();
const leftPaddlePosition = new THREE.Vector3(0, 35, 100);
const rightPaddlePosition = new THREE.Vector3(0, 34, -100);
const thirdPaddlePosition = new THREE.Vector3(-100, 30, 0);
const fourthPaddlePosition = new THREE.Vector3(100, 30, 0);
let localPlayer = 1; // Determine le joueur local (1)
let animationID; //pour stocker l'ID de l'animation


export function initPongGame4Local() {
    
    // Réinitialiser les scores et autres variables globales
    // scores = { player1: 0, player2: 0, player3: 0, player4: 0 };
    // updateScoreBoard();
	// isGamePaused = false;
	// // isResetting = false;
	// lastScorer = 'player1';
	// ballLocked = false;
	// ballOffset.set(0, 0, 0);

    console.log("Initialisation du Pong Game");

    const canvas = document.getElementById("pongCanvas");
    if (!canvas) {
        console.error("Canvas introuvable. Annulation de l'initialisation.");
        return;
    }

    setupScene(canvas);
    setupLights();
    setupObjects();
    setupPaddleMovement(); 
    resetBall(lastScorer);

    window.addEventListener("resize", handleResize);

    console.log("Démarrage de l'animation...");
    animate();
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
    const aspect = (sizes.width / 2) / sizes.height; // Diviser la largeur par 2 pour chaque viewport

    // Caméra pour le joueur 1 (gauche)
    camera1 = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
    camera1.position.set(0, 100, 275);
    camera1.lookAt(0, 0, 0);
    
    // Caméra pour le joueur 4 (droite)
    camera2 = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
    camera2.position.set(275, 105, 0);
    camera2.lookAt(0, 0, 0);

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
    
    // Activer le scissor test pour le split screen
    renderer.setScissorTest(true);
}


function handleResize() {
    // Vérifier si les objets nécessaires sont définis avant de les utiliser
    if (!camera1 || !camera2 || !renderer) {
        console.log('Caméras ou renderer non initialisés lors du redimensionnement');
        return;
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Mettre à jour les deux caméras
    camera1.aspect = (width/2) / height;
    camera1.updateProjectionMatrix();
    camera2.aspect = (width/2) / height;
    camera2.updateProjectionMatrix();
    
    // Mettre à jour le renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', handleResize);

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
	// addCornerWalls(); 
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


function updateAIPaddleRight() {
	const targetX = ball.position.x;
	// Calculez la différence entre la position actuelle du paddle droit et la position cible
	const diff = targetX - paddles.rightPaddle.position.x;
	const aiSpeed = 2;
	if (Math.abs(diff) < 7) {
		paddles.rightPaddle.userData.speed = 0;
	} else {
		// Si la balle est à droite, le bot se déplace vers la droite, sinon vers la gauche
		paddles.rightPaddle.userData.speed = diff > 0 ? aiSpeed : -aiSpeed;
	}
}

function updateAIPaddleThird() {
	const targetZ = ball.position.z;
	const diff = targetZ - paddles.thirdPaddle.position.z;
	const aiSpeed = 2;
	if (Math.abs(diff) < 7) {
		paddles.thirdPaddle.userData.speed = 0;
	} else {
		paddles.thirdPaddle.userData.speed = diff > 0 ? aiSpeed : -aiSpeed;
	}
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
    paddles.leftPaddle.userData = { speed: 0 };
    
    document.addEventListener("keydown", (event) => {
        if (event.key === "a" || event.key === "A") paddles.leftPaddle.userData.speed = -2;
        if (event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 2;
        if (event.key === "ArrowRight") paddles.fourthPaddle.userData.speed = -2;
        if (event.key === "ArrowLeft") paddles.fourthPaddle.userData.speed = 2;
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === "a" || event.key === "A" || event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 0;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") paddles.fourthPaddle.userData.speed = 0;
    });
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

        // Collision avec le paddle gauche (local si localPlayer===1, sinon distant)
        const left = paddles.leftPaddle;
        let leftXMin = left.position.x - 22;
        let leftXMax = left.position.x + 22;
        if (Math.abs(testPos.x - left.position.x) > 9) {
            leftXMin = left.position.x - 22;
            leftXMax = left.position.x + 22;
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
            lastTouch = "player1";
            console.log(`Collision avec paddle joueur 1, lastTouch = ${lastTouch}`);
            collisionDetected = true;
            break;
        }

        // Collision avec le paddle droit (local si localPlayer===2, sinon distant)
        const right = paddles.rightPaddle;
        let rightXMin = right.position.x - 22;
        let rightXMax = right.position.x + 22;
        if (Math.abs(testPos.x - right.position.x) > 9) {
            rightXMin = right.position.x - 22;
            rightXMax = right.position.x + 22;
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
            lastTouch = "player2";
            console.log(`Collision avec paddle joueur 2, lastTouch = ${lastTouch}`);
            collisionDetected = true;
            break;
        }
        // Collision avec le paddle violet (local si localPlayer===3, sinon distant)
        const fourth = paddles.fourthPaddle;
        let fourthXMin = fourth.position.x - 22;
        let fourthXMax = fourth.position.x + 22;
        const fourthZMin = fourth.position.z - 22;
        const fourthZMax = fourth.position.z + 22;

        if (
            ball.userData.speed.x > 0 &&           
            testPos.x >= fourth.position.x - 2 &&                  
            testPos.x < fourth.position.x + 1 &&                   
            testPos.z >= fourthZMin && testPos.z <= fourthZMax   
        ) {
            ball.position.x = fourth.position.x - 2;
            ball.userData.speed.x *= -1;
            ball.userData.speed.z += (testPos.z - fourth.position.z) * 0.1;
            lastTouch = "player4";
            console.log(`Collision avec paddle joueur 4, lastTouch = ${lastTouch}`);
            collisionDetected = true;
            break;
        }
        // Collision avec le paddle bleu (local si localPlayer===4, sinon distant)
        const third = paddles.thirdPaddle;
        let thirdXMin = third.position.x - 22; 
        let thirdXMax = third.position.x + 22; 
        const thirdZMin = third.position.z - 22;
        const thirdZMax = third.position.z + 22;

        if (
            ball.userData.speed.x < 0 &&
            testPos.x <= third.position.x + 1 &&
            testPos.x > third.position.x - 2 && 
            testPos.z >= thirdZMin && testPos.z <= thirdZMax 
        ) {
            ball.position.x = third.position.x + 1;
            ball.userData.speed.x *= -1;
            ball.userData.speed.z += (testPos.z - third.position.z) * 0.1;
            lastTouch = "player3";
            console.log(`Collision avec paddle joueur 3, lastTouch = ${lastTouch}`);
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

    if (ball.position.z > 120) { 
        // scores[lastScorer] += 1;
        console.log(`Balle dépassant joueur 1. lastTouch avant attribution: ${lastTouch}`);
        if (lastTouch && lastTouch !== "player1") {
            scores[lastTouch] += 1;
            console.log(`Point attribué à ${lastTouch}`);
        }
        lastScorer = 'player1';
        updateScoreBoard();
        checkForWinner();
        resetBall('player1');
        return;
    }
    if (ball.position.z < -120) { 
        // scores[lastScorer] += 1;
        console.log(`Balle dépassant joueur 2. lastTouch avant attribution: ${lastTouch}`);
        if (lastTouch && lastTouch !== "player2") {
            scores[lastTouch] += 1;
            console.log(`Point attribué à ${lastTouch}`);
        }
        lastScorer = 'player2';
        updateScoreBoard();
        checkForWinner();
        resetBall('player2');
        return;
    }
    if (ball.position.x < -120) { 
        // La balle dépasse par le côté gauche : le défenseur est player4.
        console.log(`Balle dépassant joueur 3. lastTouch avant attribution: ${lastTouch}`);
        if (lastTouch && lastTouch !== "player3") {
            scores[lastTouch] += 1;
            console.log(`Point attribué à ${lastTouch}`);
        }
        lastScorer = 'player3';
        updateScoreBoard();
        checkForWinner();
        resetBall('player3');
        return;
    }
    if (ball.position.x > 120) { 
        // La balle dépasse par le côté droit : le défenseur est player3.
        console.log(`Balle dépassant joueur 4. lastTouch avant attribution: ${lastTouch}`);
        if (lastTouch && lastTouch !== "player4") {
            scores[lastTouch] += 1;
            console.log(`Point attribué à ${lastTouch}`);
        }
        lastScorer = 'player4';
        updateScoreBoard();
        checkForWinner();
        resetBall('player4');
        return;
    }
	// checkCornerWallCollisions();
}

function resetBall(lastScorer) {
    isGamePaused = true;

    let activePaddle;
    if (lastScorer === "player1") {
        // Pour le joueur 1 (paddle gauche en Z positif)
        ball.position.set(0, 28, 91);
		activePaddle = paddles.leftPaddle;
    } else if (lastScorer === "player2") {
        // Pour le joueur 2 (paddle droit en Z négatif)
        ball.position.set(0, 28, -91);
		activePaddle = paddles.rightPaddle;
    } else if (lastScorer === "player4") {
        // Pour le joueur 3 (paddle third à droite) : place la balle légèrement à gauche du paddle
        ball.position.set(91, 28, 0);
		activePaddle = paddles.fourthPaddle;
    } else if (lastScorer === "player3") {
        // Pour le joueur 4 (paddle fourth à gauche) : place la balle légèrement à droite du paddle
        ball.position.set(-91, 28, 0);
		activePaddle = paddles.thirdPaddle;
    }

	const ballLockOffsets = {
		player1: new THREE.Vector3(0, 0, -10),   // Pour que la balle soit 10 unités devant le paddle de player1
		player2: new THREE.Vector3(0, 0, 10),  // Pour player2
		player3: new THREE.Vector3(10, 0, 0),   // Pour player3
		player4: new THREE.Vector3(-10, 0, 0)   // Pour player4
	  };
	  

	if (activePaddle) {
		ballOffset.copy(ballLockOffsets[lastScorer]);
	}
	  
    
    ball.userData.speed = { x: 0, z: 0 };
	ballLocked = true;
    lastTouch = null;

    resetPaddles();
    document.addEventListener("keydown", startBall);

    if (lastScorer === "player3" || lastScorer === "player2") {
        setTimeout(() => {
            startBall({ code: "Space" });
          }, 1000);
    } else {
        document.addEventListener("keydown", startBall);
    }
}

function resetPaddles() {
    new TWEEN.Tween(paddles.leftPaddle.position)
      .to({ x: leftPaddlePosition.x, y: leftPaddlePosition.y, z: leftPaddlePosition.z }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  
    new TWEEN.Tween(paddles.rightPaddle.position)
      .to({ x: rightPaddlePosition.x, y: rightPaddlePosition.y, z: rightPaddlePosition.z }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  
    new TWEEN.Tween(paddles.thirdPaddle.position)
      .to({ x: thirdPaddlePosition.x, y: thirdPaddlePosition.y, z: thirdPaddlePosition.z }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  
    new TWEEN.Tween(paddles.fourthPaddle.position)
      .to({ x: fourthPaddlePosition.x, y: fourthPaddlePosition.y, z: fourthPaddlePosition.z }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
}


function startBall(event) {
    if (event.code === "Space") {
        console.log(`startBall: lastTouch avant démarrage = ${lastTouch}`);
        ballLocked = false;
		let directionX = 0, directionZ = 0;
        if (lastScorer === "player1") {
            console.log("startball - player1");
            // Pour player1 (haut), la balle part vers le bas sur l'axe Z
            directionZ = 2;
            directionX = (Math.random() * 0.3 - 0.15);
        } else if (lastScorer === "player2") {
            console.log("startball - player2");
            // Pour player2 (bas), la balle part vers le haut sur l'axe Z (inverse)
            directionZ = -2;
            directionX = (Math.random() * 0.3 - 0.15);
        } else if (lastScorer === "player3") {
            console.log("startball - player3");
            // Pour player3 (à droite), la balle doit partir vers la gauche sur l'axe X
            directionX = -2;
            directionZ = (Math.random() * 0.3 - 0.15);
        } else if (lastScorer === "player4") {
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

        // Si personne n'a touché la balle pendant la pause, on considère que c'est le serveur
        if (!lastTouch) {
            lastTouch = lastScorer;
        }

        ball.userData.speed = { x: directionX, z: directionZ };
        ball.userData.ignoreCollisions = true;
        setTimeout(() => {
            ball.userData.ignoreCollisions = false;
        }, 500);
        isGamePaused = false;
        document.removeEventListener("keydown", startBall);
    }
}

function updatePaddlePositions() {
    
    paddles.leftPaddle.position.x += paddles.leftPaddle.userData.speed;
    paddles.leftPaddle.position.x = Math.max(-95, Math.min(95, paddles.leftPaddle.position.x));
    paddles.leftPaddle.position.y = 27;
    
    if(!isGamePaused && !ballLocked) {
        updateAIPaddleRight();
        updateAIPaddleThird();
        paddles.rightPaddle.position.x += paddles.rightPaddle.userData.speed;
        paddles.thirdPaddle.position.z += paddles.thirdPaddle.userData.speed;
        paddles.rightPaddle.position.x = Math.max(-95, Math.min(95, paddles.rightPaddle.position.x));
        paddles.thirdPaddle.position.z = Math.max(-95, Math.min(95, paddles.thirdPaddle.position.z));
        paddles.rightPaddle.position.y = 27;
        paddles.thirdPaddle.position.y = 27;
    }
    
    paddles.fourthPaddle.position.z += paddles.fourthPaddle.userData.speed;
    paddles.fourthPaddle.position.z = Math.max(-95, Math.min(95, paddles.fourthPaddle.position.z));
    paddles.fourthPaddle.position.y = 27;

	if (ballLocked) {
		let activePaddle;
		if (lastScorer === "player1") {
			activePaddle = paddles.leftPaddle;
		} else if (lastScorer === "player2") {
			activePaddle = paddles.rightPaddle;
		} else if (lastScorer === "player3") {
			activePaddle = paddles.thirdPaddle;
		} else if (lastScorer === "player4") {
			activePaddle = paddles.fourthPaddle;
		}
		if (activePaddle) {
			// La balle suit le paddle actif plus l'offset constant
			ball.position.copy(activePaddle.position).add(ballOffset);
		}
	}		
}

function updateScoreBoard() {
    const player1Score = document.getElementById("player1-score");
    const player2Score = document.getElementById("player2-score");
    const player3Score = document.getElementById("player3-score");
    const player4Score = document.getElementById("player4-score");
    if (player1Score && player2Score && player3Score && player4Score) {
        player1Score.innerText = scores.player1;
        player2Score.innerText = scores.player2;
        player3Score.innerText = scores.player3;
        player4Score.innerText = scores.player4;
    }
}


function checkForWinner() {
    const winningScore = 5; 
    if (scores.player1 >= winningScore) {
        displayWinnerMessage(1);
    } else if (scores.player2 >= winningScore) {
        displayWinnerMessage(2);
    } else if (scores.player3 >= winningScore) {
        displayWinnerMessage(3);
    } else if (scores.player4 >= winningScore) {
        displayWinnerMessage(4);
    }
}


function displayWinnerMessage(winner) {
    const winnerDiv = document.getElementById('winnerMessage');
    if (winner === 1) {
        winnerDiv.innerText = "Pilot 1 win!";
        winnerDiv.style.color = "red";
    } else if (winner === 2){
        winnerDiv.innerText = "Pilot 2 win!";
        winnerDiv.style.color = "green";
    } else if (winner === 3){
        winnerDiv.innerText = "Pilot 3 win!";
        winnerDiv.style.color = "purple";
    } else if (winner === 4){
        winnerDiv.innerText = "Pilot 4 win!";
        winnerDiv.style.color = "blue";
    }
    winnerDiv.style.display = 'block';
    
    // Redirection après 3 secondes
    setTimeout(() => {
        winnerDiv.style.display = 'none';
        resetGame();
        // cleanup(); // Nettoie les ressources du jeu
        window.location.href = '/#/local_menu'; 
    }, 2000);
}


function resetGame() {
    // cancelAnimationFrame(animationId);
    scores.player1 = 0;
    scores.player2 = 0;
    scores.player3 = 0;
    scores.player4 = 0;
    updateScoreBoard();
}

function animate() {
    console.log('in animate, local pong 4');
    animationID = requestAnimationFrame(animate);
    TWEEN.update();
    updatePaddlePositions();
    updateBallPosition();
    
    // Taille totale du canvas
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Rendu de la vue du joueur 1 (gauche)
    renderer.setViewport(0, 0, width/2, height);
    renderer.setScissor(0, 0, width/2, height);
    renderer.render(scene, camera1);
    
    // Rendu de la vue du joueur 4 (droite)
    renderer.setViewport(width/2, 0, width/2, height);
    renderer.setScissor(width/2, 0, width/2, height);
    renderer.render(scene, camera2);
}

export function cleanup4Local() {
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