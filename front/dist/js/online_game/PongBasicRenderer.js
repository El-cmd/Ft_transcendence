import { BasicLoader } from "../loaders/BasicLoader.js";
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { eventWebSocket } from '../services/EventWsManager.js';
import { EventFetcher } from '../events/EventFetcher.js';
import { router } from '../Router.js';

// enum onlineGameType {
//     'Duo',
//     'Squad'
// }

export class PongBasicRenderer // extends BasicLoader ?
{
    constructor() {
        this.animationID = null; // stocker l'ID de l'animation
        this.isDuo = false;
        this.scene = null;
        this.renderer = null;
        this.paddles = null;
        this.ball = null;
        this.camera = null;

        // set these in the constructor of children classes, based on the number of players for the current game (passer as parameter)
        this.scores = {};
        this.paddlePositions = {};

        this.nextServer = 1;
        this.localPlayer = 0;
        this.isGamePaused = false;
        this.lastTouch = null;
        this.ballLocked = false;
        this.ballOffset = new THREE.Vector3(0, 0, 0); // ou (0, 0, 0) par defaut et pas besoin de le preciser ?

        // in children classes :
        this.resetScores();
        this.resetpaddle
    }

    async initPongGame() { // l'appelle dans le constructeur ? 
        try 
        {
            console.log('in initPongGame2');
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
            
            // Réinitialiser les scores et autres variables globales
            scores = { player1: 0, player2: 0 };
            // ballOffset.set(0, 0, 0);
            
            console.log("Initialisation du Pong Game");
            
            const canvas = document.getElementById("pongCanvas");
            if (!canvas) {
                console.error("Canvas introuvable. Annulation de l'initialisation.");
                return;
            }
            
            console.log("Canvas trouvé, on continue l'initialisation...");
            
            this.globalSetUp();
            
            // First remove any existing event listeners to prevent duplicates
            window.removeEventListener("resize", handleResize);
            window.addEventListener("resize", handleResize);
            
            // Enable forfeit check with the local player ID
            router.enableForfeitCheck(localPlayer);
            console.log("Démarrage de l'animation...");
            animate();
        } catch (error) 
        {
            console.error("Error initializing game:", error);
        }
    }

    globalSetUp() {
        this.setUpScene();
        this.setUpLights();
        this.setUpObjects();
        this.setUpPaddleMovement(); 
        this.resetBall();


    }

    cleanUp() {

    }

    setUpScene() {
        const sizes = { width: window.innerWidth, height: window.innerHeight };
        const fov = 60;
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1, 2000);
        
        if (this.localPlayer === 1) {
            this.camera.position.set(0, 75, 200);
        }
        else if (this.localPlayer === 2) {
            this.camera.position.set(0, 75, -200);
        }
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(sizes.width, sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
    }

    setUpLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
    }

    // might need to be overriden in children classes as this requires to know how many players there are 
    setUpObjects() {
        this.addFloor();
        this.paddles = this.addPaddles();
        this.addBall();
        
        if (this.isDuo)
            this.addWalls();
    }

    addFloor() {
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
        this.scene.add(floor);

        const edgeGeometry = new THREE.EdgesGeometry(floorGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCCC, linewidth: 2 });
        const floorEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        floorEdges.rotation.x = -Math.PI / 2;
        floorEdges.position.y = -3.01;
        this.scene.add(floorEdges);
    }

    addWalls() {
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
        this.scene.add(leftWall);
        const rightWall = new THREE.Mesh(geometry, wallMaterial);
        rightWall.position.set(-90, -5, -10);
        this.scene.add(rightWall);
    }

    addPaddles() {
        // override in children classes

        // set up this.paddles -> map each paddle to localPlayer ID (ie localPlayer 1 has paddles[1])
    }

    addBall() {
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

        this.scene.add(ball);
        ball.userData = { speed: { x: 0, z: 0 } };
        this.ball = ball;
        // return ball;
    }

    setUpPaddleMovement() {
        this.paddles[this.localPlayer].userData = { speed: 0 };
        const paddle = this.paddles[this.localPlayer];
        const speeds = {1: -2, 2: 2, 3: 2, 4: -2}; // faire une macro (ou variable globale au module) plutot
        console.log('possible speeds for paddles based on localPlayer id : ', speeds);

        document.addEventListener("keydown", (event) => {
            const upperKey = event.key.toUpperCase();
            if (upperKey === "A")
                paddle.userData.speed = speeds[this.localPlayer];
            if (upperKey === "D")
                paddle.userData.speed = -1 * speeds[this.localPlayer];
            // console.log('key_down', paddles.rightPaddle.userData.speed)
        })

        document.addEventListener("keyup", (event) => {
            const upperKey = event.key.toUpperCase();
            if (upperKey === "A" || upperKey === "D")
                paddle.userData.speed = 0;
        })
    }

    resetBall() {
        //  override in children classes 
    }



    hasBallAuthority() {
        return (this.localPlayer === this.nextServer);
    }

}

