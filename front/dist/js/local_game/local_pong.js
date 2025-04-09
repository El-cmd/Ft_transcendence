import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';

let scene, camera, renderer, paddles, ball;
let scores = { player1: 0, player2: 0 };
let isGamePaused = false;
let isResetting = false;
let lastScorer = 'player1';
let ballLocked = false;
let ballOffset = new THREE.Vector3(); 
const leftPaddlePosition = new THREE.Vector3(0, 27, 90);
const rightPaddlePosition = new THREE.Vector3(0, 27, -90);
let localPlayer = 1;
let animationID; //pour stocker l'ID de l'animation

export function initPongGameLocal() {
    
    // Réinitialiser les scores et autres variables globales
    // scores = { player1: 0, player2: 0 };
    // updateScoreBoard();
	// isGamePaused = false;
	// isResetting = false;
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

	// Ajuste la taille du renderer en fonction de la taille du canvas
	if (canvas.width !== width || canvas.height !== height) {
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
}


  function setupScene(canvas) {
	scene = new THREE.Scene();

	const sizes = {
		width: window.innerWidth,
		height: window.innerHeight
	};

	const fov = 60;
	camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1, 2000);

	camera.position.set(0, 75, 200); 
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
}


// function updateCameraPosition() {
// 	camera.position.set(0, 50, 50); 
// 	camera.lookAt(new THREE.Vector3(0, 0, 0)); 
// }

const axesHelper = new THREE.AxesHelper(3)

function handleResize() {
	const sizes = {
		width: window.innerWidth,
		height: window.innerHeight
	};
	if (!camera) return;
	console.log(camera); // Vérifie si camera est défini
	camera.aspect = sizes.width / sizes.height;
	console.log(camera); // Vérifie si camera est défini
	camera.updateProjectionMatrix();
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	camera.position.z = 190;
	camera.lookAt(new THREE.Vector3(0, 0, 0));
}

window.addEventListener('resize', handleResize);


function setupLights() {
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(0, 100, 50);
	directionalLight.castShadow = true;

	// Augmente la resolution des ombres pour eviter un rendu flou
	directionalLight.shadow.mapSize.width = 2048;
	directionalLight.shadow.mapSize.height = 2048;
	
	// Ajuste la zone de projection des ombres
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

	// Configure la texture pour qu'elle se repete et ne soit pas etiree
	floorTexture.wrapS = THREE.RepeatWrapping;
	floorTexture.wrapT = THREE.RepeatWrapping;
	floorTexture.repeat.set(4, 4);

	const floorMaterial = new THREE.MeshStandardMaterial({
		map: floorTexture,
		side: THREE.DoubleSide,
		roughness: 0.3,
		// metalness: 0.5,
	});
	// Dimensions du sol
	const width = 170; //largeur
	const height = 200; //hauteur/longueur
	const depth = 20; // epaisseur
	const radius = 20; // Rayon pour arrondir les coins

	// Creation d'un shape avec coins arrondis
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

	// Extrude la forme
	const extrudeSettings = {
		depth: depth,
		bevelEnabled: false,
		steps: 1
	};
	const floorGeometry = new THREE.ExtrudeGeometry(roundedShape, extrudeSettings);

	// Generer les UVs correctement pour bien mapper la texture
	floorGeometry.computeBoundingBox();
	const max = floorGeometry.boundingBox.max;
	const min = floorGeometry.boundingBox.min;

	const uvAttribute = floorGeometry.attributes.position;
	const uvs = [];

	for (let i = 0; i < uvAttribute.count; i++) {
		const x = uvAttribute.getX(i);
		const y = uvAttribute.getY(i);
		uvs.push((x - min.x) / (max.x - min.x));
		uvs.push((y - min.y) / (max.y - min.y));
	}
	floorGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

	const floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -3;
	floor.receiveShadow = true;
	scene.add(floor);

	// contours en gris clair 
	const edgeGeometry = new THREE.EdgesGeometry(floorGeometry);
	const edgeMaterial = new THREE.LineBasicMaterial({
		color: 0xCCCCCC,
		linewidth: 2
	});
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
		// emissive: 0xff0000,
		emissiveIntensity: 1.5,
	});

	const rightPaddleMaterial = new THREE.MeshStandardMaterial({
		map: rightPaddleTexture,
		// emissive: 0x00ff00,
		emissiveIntensity: 1.5,
	});
	const leftPaddle = new THREE.Mesh(paddleGeometry, leftPaddleMaterial);
	leftPaddle.position.copy(leftPaddlePosition); //rouge
	leftPaddle.castShadow = true;
	scene.add(leftPaddle);

	const rightPaddle = new THREE.Mesh(paddleGeometry, rightPaddleMaterial);
	rightPaddle.position.copy(rightPaddlePosition); //vert
	rightPaddle.castShadow = true;
	scene.add(rightPaddle);
	return { leftPaddle, rightPaddle };
}

function updateAIPaddle() {
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


function addBall() {
	const textureLoader = new THREE.TextureLoader();
	const ballTexture = textureLoader.load('img/contourMetal.png');

	ballTexture.wrapS = THREE.RepeatWrapping;
	ballTexture.wrapT = THREE.RepeatWrapping;
	ballTexture.repeat.set(1, 1);

	const ballGeometry = new THREE.SphereGeometry(3.5, 32, 32);
	const ballMaterial = new THREE.MeshStandardMaterial({
		map: ballTexture, 
		// emissive: new THREE.Color(0xffffff),
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
	paddles.leftPaddle.userData = { speed: 0 };

	document.addEventListener("keydown", (event) => {
		if (event.key === "a" || event.key === "A") paddles.leftPaddle.userData.speed = -2;
		if (event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 2;
	});

	document.addEventListener("keyup", (event) => {
		if (event.key === "a" || event.key === "A" || event.key === "d" || event.key === "D") paddles.leftPaddle.userData.speed = 0;
	});
}


function updateBallPosition() {
	if (isGamePaused) return;
	// Nombre de sous-pas pour subdiviser le deplacement
	const steps = 10;
	// Calcul du vecteur de deplacement par sous-pas
	const stepVector = new THREE.Vector3(
		ball.userData.speed.x,
		0,
		ball.userData.speed.z
	).divideScalar(steps);

	let collisionDetected = false;

	// On parcourt les sous-pas
	for (let i = 1; i <= steps; i++) {
		// Position intermediaire
		const testPos = ball.position.clone().add(stepVector.clone().multiplyScalar(i));

		// --- Collision avec les murs (axe X) ---
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

		// if (!collisionDetected) {
		// 	ball.position.add(new THREE.Vector3(ball.userData.speed.x, 0, ball.userData.speed.z));
		// }

		// --- Collision avec le paddle gauche (rouge)---
		const left = paddles.leftPaddle;
		let leftXMin = left.position.x - 20;
		let leftXMax = left.position.x + 20;
		if (Math.abs(testPos.x - left.position.x) > 9) {
			leftXMin = left.position.x - 20;
			leftXMax = left.position.x + 20;
		}
		if (
			ball.userData.speed.z > 0 && // La balle se deplace vers le paddle gauche
			testPos.z >= left.position.z - 2 &&	// Entre la limite inferieure
			testPos.z < left.position.z + 1 &&	// et la limite superieure
			testPos.x >= leftXMin &&
			testPos.x <= leftXMax
		) {
			ball.position.z = left.position.z - 2;  // Positionne la balle juste avant le paddle
			ball.userData.speed.z *= -1; // Inverse la direction verticale
			ball.userData.speed.x += (testPos.x - left.position.x) * 0.1;
			collisionDetected = true;
			break;
		}

		// --- Collision avec le paddle droit (vert)---
		const right = paddles.rightPaddle;
		let rightXMin = right.position.x - 20;
		let rightXMax = right.position.x + 20;
		if (Math.abs(testPos.x - right.position.x) > 9) {
			rightXMin = right.position.x - 20;
			rightXMax = right.position.x + 20;
		}
		if (
			ball.userData.speed.z < 0 &&					  // La balle se déplace vers le paddle droit
			testPos.z <= right.position.z + 1 &&			  // Entre la limite supérieure
			testPos.z > right.position.z - 2 &&			   // et la limite inférieure
			testPos.x >= rightXMin &&
			testPos.x <= rightXMax
		) {
			ball.position.z = right.position.z + 1; // Positionne la balle juste après le paddle
			ball.userData.speed.z *= -1;
			ball.userData.speed.x += (testPos.x - right.position.x) * 0.1;
			collisionDetected = true;
			break;
		}
	}
	// maj la position complete (verif)
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

	if (ball.position.z > 150) { 
		scores.player2 += 1;
		lastScorer = 'player1';
		updateScoreBoard();
		checkForWinner();
		resetBall('player1');
		return;
	}
	if (ball.position.z < -150) { 
		scores.player1 += 1;
		lastScorer = 'player2';
		updateScoreBoard();
		checkForWinner();
		resetBall('player2');
		return;
	}
	ball.position.y = 27;
}


function resetBall(lastScorer) {
	isGamePaused = true; // Met le jeu en pause pendant le reset
  
	// Positionne la balle instantanément
	const ballZ = lastScorer === "player1" ? -85 : 85;
	ball.position.set(0, 26, ballZ);
	ball.userData.speed = { x: 0, z: 0 };
  
	const ballLockOffsets = {
		player1: new THREE.Vector3(0, 0, -10),
		player2: new THREE.Vector3(0, 0, 10)
	};
	ballOffset.copy(ballLockOffsets[lastScorer]);
	
	ballLocked = true;
	// lastTouch = null;

	resetPaddles();
	document.addEventListener("keydown", startBall);

	if (lastScorer === "player2") {
		setTimeout(() => {
		  startBall({ code: "Space" });
		}, 1000);
	  } else {
		document.addEventListener("keydown", startBall);
	  }
}
  


function resetPaddles() {
	// isResetting = true;
	new TWEEN.Tween(paddles.leftPaddle.position)
	  .to({ 
		x: leftPaddlePosition.x, 
		y: leftPaddlePosition.y, 
		z: leftPaddlePosition.z 
	  }, 1000)
	  .easing(TWEEN.Easing.Quadratic.Out)
	//   .onComplete(() => { isResetting = false; })
	  .start();
  
	new TWEEN.Tween(paddles.rightPaddle.position)
	  .to({ 
		x: rightPaddlePosition.x, 
		y: rightPaddlePosition.y, 
		z: rightPaddlePosition.z 
	  }, 1000)
	  .easing(TWEEN.Easing.Quadratic.Out)
	  .start();
}
  

function startBall(event) {
	if (event.code === "Space") {
		let directionZ = lastScorer === "player1" ? 2 : -2; // Joueur 1 perd → balle vers joueur 2 + Vitesse balle
		let directionX = (Math.random() * 0.3 - 0.15); // direction aleatoire

		if (Math.abs(directionX) < 0.1) {
			directionX = directionX > 0 ? 0.1 : -0.1;
		}
		ball.userData.speed = { x: directionX, z: directionZ };

		ball.userData.ignoreCollisions = true;  // empeche collisions avec paddles au lancement
		setTimeout(() => {
			 ball.userData.ignoreCollisions = false;
		}, 500);  // Apres 500ms la balle pourra rebondir normalement

		isGamePaused = false;
		ballLocked = false;
		document.removeEventListener("keydown", startBall);
	}
}


function updatePaddlePositions() {
	paddles.leftPaddle.position.x += paddles.leftPaddle.userData.speed;
	paddles.leftPaddle.position.x = Math.max(-63, Math.min(63, paddles.leftPaddle.position.x));
	paddles.leftPaddle.position.y = 27;
	
	if (!isGamePaused && !ballLocked) {
	  updateAIPaddle();
	  paddles.rightPaddle.position.x += paddles.rightPaddle.userData.speed;
	  paddles.rightPaddle.position.x = Math.max(-69, Math.min(69, paddles.rightPaddle.position.x));
	  paddles.rightPaddle.position.y = 27;
	}
	
	if (ballLocked) {
	  let activePaddle;

	  if (lastScorer === "player1") {
		activePaddle = paddles.leftPaddle;
	  } else if (lastScorer === "player2") {
		activePaddle = paddles.rightPaddle;
	  }
	  if (activePaddle) {
		ball.position.copy(activePaddle.position).add(ballOffset);
	  }
	}
}
  

function updateScoreBoard() {
	const player1Score = document.getElementById("player1-score");
	const player2Score = document.getElementById("player2-score");

	if (player1Score && player2Score) {
		player1Score.innerText = scores.player1;
		player2Score.innerText = scores.player2;
	}
}


function checkForWinner() {
	const winningScore = 5; 
	if (scores.player1 >= winningScore) {
		displayWinnerMessage(1);
	} else if (scores.player2 >= winningScore) {
		displayWinnerMessage(2);
	}
}


function displayWinnerMessage(winner) {
	const winnerDiv = document.getElementById('winnerMessage');
	if (winner === 1) {
		winnerDiv.innerText = "Pilot 1 win!";
		winnerDiv.style.color = "red";
	} else if (winner === 2) {
		winnerDiv.innerText = "Pilot 2 win!";
		winnerDiv.style.color = "green";
	}
	winnerDiv.style.display = 'block';
	
	setTimeout(() => {
		winnerDiv.style.display = 'none';
		resetGame();
		window.location.href = '/#/local_menu';
	}, 2000);
}


function resetGame() {
	// cancelAnimationFrame(animationId);
	scores.player1 = 0;
	scores.player2 = 0;
	updateScoreBoard(); // Reinitialise les scores
}


function animate() {
	console.log('in animate, local pong solo');
	animationID = requestAnimationFrame(animate);
	TWEEN.update();
	updatePaddlePositions();
	updateBallPosition();
	resizeCanvasToDisplaySize();
	// sendGameState(); // Envoie l'état du jeu au serveur (a faire)
	renderer.render(scene, camera);
}

export function cleanup1Local() {
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