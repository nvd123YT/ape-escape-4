// Ape Escape 4 - 3D Platformer Game
// Game Engine Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 200, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(100, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
scene.add(sunLight);

// Player Object
const player = {
    position: new THREE.Vector3(0, 3, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 0.15,
    jumpForce: 0.8,
    isJumping: false,
    isGrounded: false,
    health: 100,
    maxHealth: 100,
    capturedApes: 0,
    currentGadget: 'stun',
    gadgets: {
        stun: { name: 'Stun Rod', cooldown: 0, maxCooldown: 30 },
        hook: { name: 'Time Hook', cooldown: 0, maxCooldown: 45 },
        net: { name: 'Capture Net', cooldown: 0, maxCooldown: 60 },
        radar: { name: 'Ape Radar', cooldown: 0, maxCooldown: 20 }
    }
};

// Create Player Mesh (capsule shape)
const playerGeometry = new THREE.CapsuleGeometry(0.4, 1.8, 4, 8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
playerMesh.position.copy(player.position);
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;
scene.add(playerMesh);

// Camera Follow
const cameraOffset = new THREE.Vector3(0, 0.8, 3);

// Input System
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    handleKeyPress(e);
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function handleKeyPress(e) {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 4) {
        const gadgetMap = { 1: 'stun', 2: 'hook', 3: 'net', 4: 'radar' };
        switchGadget(gadgetMap[num]);
    }
}

// Mouse Look
let mouseDown = false;
let mouseDelta = { x: 0, y: 0 };
let cameraRotation = { x: 0, y: 0 };

renderer.domElement.addEventListener('mousedown', () => { mouseDown = true; });
renderer.domElement.addEventListener('mouseup', () => { mouseDown = false; });
renderer.domElement.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        mouseDelta.x += e.movementX * 0.01;
        mouseDelta.y += e.movementY * 0.01;
    }
});

// Gadget System
function switchGadget(gadgetName) {
    player.currentGadget = gadgetName;
    updateGadgetDisplay();
}

function updateGadgetDisplay() {
    document.querySelectorAll('.gadget').forEach(el => el.classList.remove('active'));
    const gadgetMap = { stun: 'gadget-stun', hook: 'gadget-hook', net: 'gadget-net', radar: 'gadget-radar' };
    document.getElementById(gadgetMap[player.currentGadget]).classList.add('active');
}

// Use Gadget
renderer.domElement.addEventListener('click', () => {
    useGadget();
});

function useGadget() {
    const gadget = player.gadgets[player.currentGadget];
    if (gadget.cooldown > 0) return;

    gadget.cooldown = gadget.maxCooldown;

    // Create effect based on gadget
    const direction = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    
    switch(player.currentGadget) {
        case 'stun':
            createStunEffect(direction);
            break;
        case 'hook':
            createHookEffect(direction);
            break;
        case 'net':
            createNetEffect(direction);
            break;
        case 'radar':
            activateRadar();
            break;
    }
}

function createStunEffect(direction) {
    const rays = 8;
    for (let i = 0; i < rays; i++) {
        const angle = (Math.PI * 2 / rays) * i;
        const rayDir = new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        );
        
        const effectMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffff00, emissive: 0xffff00 })
        );
        effectMesh.position.copy(player.position).add(rayDir.multiplyScalar(2));
        scene.add(effectMesh);
        
        // Check for nearby apes
        apes.forEach(ape => {
            const distance = effectMesh.position.distanceTo(ape.mesh.position);
            if (distance < 3) {
                ape.stunned = true;
                ape.stunTime = 120;
                showMessage('Ape Stunned!');
            }
        });
        
        // Remove effect
        setTimeout(() => scene.remove(effectMesh), 500);
    }
}

function createHookEffect(direction) {
    const effectMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 1, 8),
        new THREE.MeshBasicMaterial({ color: 0x4ecdc4, emissive: 0x4ecdc4 })
    );
    effectMesh.position.copy(player.position).addScaledVector(direction, 2);
    scene.add(effectMesh);
    
    let distance = 0;
    const moveInterval = setInterval(() => {
        distance += 0.5;
        effectMesh.position.addScaledVector(direction, 0.5);
        
        apes.forEach(ape => {
            const dist = effectMesh.position.distanceTo(ape.mesh.position);
            if (dist < 2) {
                ape.velocity.copy(direction.multiplyScalar(0.3));
            }
        });
        
        if (distance > 50) {
            clearInterval(moveInterval);
            scene.remove(effectMesh);
        }
    }, 20);
}

function createNetEffect(direction) {
    const netMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 4),
        new THREE.MeshBasicMaterial({ color: 0x95e1d3, wireframe: true })
    );
    netMesh.position.copy(player.position).addScaledVector(direction, 2);
    scene.add(netMesh);
    
    let distance = 0;
    const moveInterval = setInterval(() => {
        distance += 0.6;
        netMesh.position.addScaledVector(direction, 0.6);
        netMesh.rotation.x += 0.1;
        netMesh.rotation.y += 0.15;
        
        apes.forEach(ape => {
            const dist = netMesh.position.distanceTo(ape.mesh.position);
            if (dist < 1.5 && !ape.captured) {
                ape.captured = true;
                player.capturedApes++;
                scene.remove(ape.mesh);
                scene.remove(ape.nameLabel);
                showMessage(`${ape.name} Captured!`);
                updateHUD();
            }
        });
        
        if (distance > 60) {
            clearInterval(moveInterval);
            scene.remove(netMesh);
        }
    }, 20);
}

function activateRadar() {
    showMessage('Ape Radar Active!');
    apes.forEach(ape => {
        ape.radarActive = true;
        ape.radarTime = 180;
    });
}

function showMessage(text) {
    const msg = document.createElement('div');
    msg.id = 'message';
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// Ape Class
class Ape {
    constructor(name, timePeriod, position, behavior) {
        this.name = name;
        this.timePeriod = timePeriod;
        this.position = position;
        this.behavior = behavior;
        this.velocity = new THREE.Vector3();
        this.speed = 0.05 + Math.random() * 0.05;
        this.health = 100;
        this.stunned = false;
        this.stunTime = 0;
        this.captured = false;
        this.radarActive = false;
        this.radarTime = 0;
        this.targetPosition = position.clone();
        
        // Create mesh
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 8, 8),
            new THREE.MeshStandardMaterial({ color: this.getColor() })
        );
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        // Create name label
        this.createNameLabel();
    }
    
    getColor() {
        const colors = [0xff6b6b, 0xffd93d, 0x6bcf7f, 0x4d96ff, 0xff9ff3];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    createNameLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 40px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 45);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.nameLabel = new THREE.Sprite(spriteMaterial);
        this.nameLabel.scale.set(3, 0.75, 1);
        this.nameLabel.position.copy(this.mesh.position).add(new THREE.Vector3(0, 1.2, 0));
        scene.add(this.nameLabel);
    }
    
    update() {
        if (this.captured) return;
        
        // Stun behavior
        if (this.stunned) {
            this.stunTime--;
            if (this.stunTime <= 0) this.stunned = false;
            this.velocity.multiplyScalar(0.9);
        } else {
            // Movement behavior
            if (Math.random() < 0.02) {
                this.targetPosition = new THREE.Vector3(
                    this.position.x + (Math.random() - 0.5) * 30,
                    this.position.y,
                    this.position.z + (Math.random() - 0.5) * 30
                );
            }
            
            const direction = this.targetPosition.clone().sub(this.mesh.position);
            if (direction.length() > 0.5) {
                direction.normalize();
                this.velocity.lerp(direction.multiplyScalar(this.speed), 0.1);
            } else {
                this.velocity.lerp(new THREE.Vector3(0, 0, 0), 0.1);
            }
        }
        
        this.mesh.position.add(this.velocity);
        this.mesh.position.y = 2.2; // Keep on ground
        this.nameLabel.position.copy(this.mesh.position).add(new THREE.Vector3(0, 1.2, 0));
        
        // Radar glow
        if (this.radarActive) {
            this.radarTime--;
            this.mesh.material.emissive.setHex(0xffff00);
        } else {
            this.mesh.material.emissive.setHex(0x000000);
        }
    }
}

// Level Environment
function createEnvironment() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    
    // Add a solid ground box underneath
    const groundBoxGeometry = new THREE.BoxGeometry(200, 2, 200);
    const groundBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x1a6b1a });
    const groundBox = new THREE.Mesh(groundBoxGeometry, groundBoxMaterial);
    groundBox.position.y = -1;
    groundBox.receiveShadow = true;
    groundBox.castShadow = true;
    scene.add(groundBox);
    
    // Platforms
    const platforms = [
        { pos: [0, 0, 0], size: [200, 1, 200] },
        { pos: [-30, 4, -30], size: [20, 1, 20] },
        { pos: [30, 4, -30], size: [20, 1, 20] },
        { pos: [0, 6, -50], size: [20, 1, 20] },
        { pos: [40, 3, 30], size: [30, 1, 30] },
        { pos: [-50, 5, 10], size: [15, 1, 15] }
    ];
    
    platforms.forEach(p => {
        const platformGeometry = new THREE.BoxGeometry(...p.size);
        const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
        platformMesh.position.set(...p.pos);
        platformMesh.receiveShadow = true;
        platformMesh.castShadow = true;
        scene.add(platformMesh);
    });
    
    // Decorative trees
    for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 2, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        scene.add(trunk);
        
        const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(x, 6, z);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        scene.add(foliage);
    }
}

createEnvironment();

// Create Apes
const apes = [
    new Ape('Spike', 'Prehistoric', new THREE.Vector3(-20, 2.2, -30), 'aggressive'),
    new Ape('Buzz', 'Prehistoric', new THREE.Vector3(20, 2.2, -25), 'curious'),
    new Ape('Pippo', 'Ancient Egypt', new THREE.Vector3(0, 2.2, -40), 'playful'),
    new Ape('Kei', 'Medieval', new THREE.Vector3(30, 2.2, 0), 'cautious'),
    new Ape('Yumi', 'Futuristic', new THREE.Vector3(-30, 2.2, 20), 'mischievous')
];

// Raycaster for ground detection
const raycaster = new THREE.Raycaster();
const rayDirection = new THREE.Vector3(0, -1, 0);

function isGrounded() {
    raycaster.set(player.position, rayDirection);
    const intersects = raycaster.intersectObjects(scene.children);
    return intersects.length > 0 && intersects[0].distance < 1;
}

// Update HUD
function updateHUD() {
    document.getElementById('health').textContent = player.health;
    document.getElementById('captured').textContent = player.capturedApes;
    document.getElementById('totalApes').textContent = apes.length;
}

// Game Loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update player movement
    const movement = new THREE.Vector3();
    if (keys['w'] || keys['arrowup']) movement.z -= 1;
    if (keys['s'] || keys['arrowdown']) movement.z += 1;
    if (keys['a'] || keys['arrowleft']) movement.x -= 1;
    if (keys['d'] || keys['arrowright']) movement.x += 1;
    
    if (movement.length() > 0) {
        movement.normalize();
        movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        player.velocity.x = movement.x * player.speed;
        player.velocity.z = movement.z * player.speed;
    } else {
        player.velocity.x *= 0.9;
        player.velocity.z *= 0.9;
    }
    
    // Gravity
    player.velocity.y -= 0.01;
    player.position.add(player.velocity);
    
    // Ground collision
    if (isGrounded()) {
        player.velocity.y = 0;
        player.isGrounded = true;
        player.position.y = Math.max(player.position.y, 2.2);
    } else {
        player.isGrounded = false;
    }
    
    // Jump
    if ((keys[' ']) && player.isGrounded) {
        player.velocity.y = player.jumpForce;
        player.isGrounded = false;
    }
    
    // Boundary check
    if (player.position.y < -50) {
        player.position.set(0, 3, 0);
        player.velocity.set(0, 0, 0);
    }
    
    // Update player mesh
    playerMesh.position.copy(player.position);
    
    // Update camera with initial forward tilt
    cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x + mouseDelta.y));
    cameraRotation.y += mouseDelta.x;
    mouseDelta.x = 0;
    mouseDelta.y = 0;
    
    const cameraPos = new THREE.Vector3(0, 0.6, 3);
    cameraPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    cameraPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.x);
    camera.position.copy(player.position).add(cameraPos);
    
    // Look ahead slightly
    const lookTarget = player.position.clone();
    lookTarget.y += 0.8;
    const lookDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    lookTarget.add(lookDirection.multiplyScalar(5));
    camera.lookAt(lookTarget);
    
    // Update gadget cooldowns
    Object.values(player.gadgets).forEach(gadget => {
        if (gadget.cooldown > 0) gadget.cooldown--;
    });
    
    // Update apes
    apes.forEach(ape => ape.update());
    
    // Check win condition
    if (player.capturedApes === apes.length) {
        showMessage('Level Complete! All Apes Captured!');
    }
    
    renderer.render(scene, camera);
}

updateHUD();
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();