const { useState, useEffect, useRef, useCallback } = React;

const SpaceCombatGame = () => {
  // Game states
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused'
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Player state
  const [player, setPlayer] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    health: 100,
    maxHealth: 100,
    xp: 0,
    level: 1,
    team: null,
    isDead: false,
    deathTime: 0,
    upgrades: {
      damage: 1,
      fireRate: 1,
      extraCannons: [],
      directions: ['front']
    }
  });

  // Admin state
  const [adminConsole, setAdminConsole] = useState({
    isOpen: false,
    noHealthDecay: false,
    command: ''
  });

  // Mouse position
  const mousePosition = useRef({ x: 0, y: 0, worldX: 0, worldZ: 0 });
  
  const [enemies, setEnemies] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  
  // Refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerMeshRef = useRef(null);
  const keysPressed = useRef({});
  const lastShotTime = useRef(0);
  const animationFrameId = useRef(null);
  
  // Team configurations
  const teams = {
    red: { name: 'Red Phoenix', color: 0xff0044, glowColor: '#ff0044' },
    blue: { name: 'Blue Wolves', color: 0x0088ff, glowColor: '#0088ff' },
    green: { name: 'Green Dragons', color: 0x00ff88, glowColor: '#00ff88' }
  };
  
  // XP levels and requirements
  const getLevelRequirement = (level) => level * 100 + Math.pow(level, 2) * 50;
  
  const getAvailableUpgrades = (level) => {
    const upgrades = [];
    if (level >= 2) upgrades.push({ type: 'fireRate', name: 'Fire Rate +', description: 'Shoot faster' });
    if (level >= 3) upgrades.push({ type: 'damage', name: 'Damage +', description: 'More damage per shot' });
    if (level >= 4) upgrades.push({ type: 'extraCannons', value: 'side', name: 'Side Cannons', description: 'Shoot from sides' });
    if (level >= 5) upgrades.push({ type: 'extraCannons', value: 'back', name: 'Back Cannon', description: 'Shoot backwards' });
    if (level >= 6) upgrades.push({ type: 'extraCannons', value: 'diagonal', name: 'Diagonal Cannons', description: 'Shoot diagonally' });
    if (level >= 7) upgrades.push({ type: 'health', name: 'Max Health +', description: 'Increase max health' });
    return upgrades;
  };
  
  // Initialize Three.js scene
  useEffect(() => {
    if (gameState !== 'playing' || !mountRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);
    sceneRef.current = scene;
    
    // Camera setup (bird's eye view)
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    // Create grass floor with texture
    const floorGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

    // Create procedural grass texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base grass color
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 512, 512);

    // Add grass texture variation
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.random() * 40 - 20;
      const green = 80 + shade;
      const red = 45 + shade / 2;
      ctx.fillStyle = `rgb(${red}, ${green}, 16)`;
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(8, 8);

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 0.9,
      metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arena walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066cc,
      emissive: 0x003366,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.3
    });
    
    const walls = [
      { pos: [0, 5, 50], rot: [0, 0, 0], size: [100, 10, 1] },
      { pos: [0, 5, -50], rot: [0, 0, 0], size: [100, 10, 1] },
      { pos: [50, 5, 0], rot: [0, Math.PI / 2, 0], size: [100, 10, 1] },
      { pos: [-50, 5, 0], rot: [0, Math.PI / 2, 0], size: [100, 10, 1] }
    ];
    
    walls.forEach(wall => {
      const geometry = new THREE.BoxGeometry(...wall.size);
      const mesh = new THREE.Mesh(geometry, wallMaterial);
      mesh.position.set(...wall.pos);
      mesh.rotation.set(...wall.rot);
      scene.add(mesh);
    });
    
    // Create human player character
    const createHumanCharacter = (color) => {
      const group = new THREE.Group();

      // Body
      const bodyGeometry = new THREE.BoxGeometry(0.6, 1, 0.4);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.3
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.8
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.3;
      head.castShadow = true;
      group.add(head);

      // Arms
      const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      const armMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7
      });

      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.5, 0.6, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.5, 0.6, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      // Legs
      const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
      const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8
      });

      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.2, -0.35, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.2, -0.35, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      // Weapon indicator (points forward)
      const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
      const weaponMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8
      });
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      weapon.position.set(0, 0.8, 0.4);
      group.add(weapon);

      return group;
    };

    const playerCharacter = createHumanCharacter(teams[selectedTeam].color);
    playerCharacter.position.set(player.position.x, 0, player.position.z);
    scene.add(playerCharacter);
    playerMeshRef.current = playerCharacter;
    
    // Generate initial rocks
    const initialRocks = [];
    for (let i = 0; i < 20; i++) {
      initialRocks.push({
        id: Math.random(),
        position: {
          x: (Math.random() - 0.5) * 80,
          y: 0,
          z: (Math.random() - 0.5) * 80
        },
        health: 30,
        maxHealth: 30,
        rotation: Math.random() * Math.PI * 2
      });
    }
    setRocks(initialRocks);
    
    // Generate enemy players
    const initialEnemies = [];
    const otherTeams = Object.keys(teams).filter(t => t !== selectedTeam);
    for (let i = 0; i < 6; i++) {
      const team = otherTeams[Math.floor(Math.random() * otherTeams.length)];
      initialEnemies.push({
        id: Math.random(),
        name: `Player ${i + 1}`,
        team: team,
        position: {
          x: (Math.random() - 0.5) * 80,
          y: 0,
          z: (Math.random() - 0.5) * 80
        },
        rotation: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        level: Math.floor(Math.random() * 3) + 1,
        aiState: {
          targetX: 0,
          targetZ: 0,
          lastShot: 0,
          behavior: Math.random() > 0.5 ? 'aggressive' : 'defensive'
        }
      });
    }
    setEnemies(initialEnemies);
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState, selectedTeam]);
  
  // Keyboard and mouse controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused');
      }
      if (e.key.toLowerCase() === 'p' && gameState === 'playing') {
        setAdminConsole(prev => ({ ...prev, isOpen: !prev.isOpen }));
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e) => {
      // Store screen mouse position
      mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Calculate world position using raycaster
      if (cameraRef.current) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(
          new THREE.Vector2(mousePosition.current.x, mousePosition.current.y),
          cameraRef.current
        );

        // Raycast to y=0 plane (ground)
        const planeY = 0;
        const distance = (planeY - cameraRef.current.position.y) / raycaster.ray.direction.y;
        const point = raycaster.ray.origin.clone().add(
          raycaster.ray.direction.clone().multiplyScalar(distance)
        );

        mousePosition.current.worldX = point.x;
        mousePosition.current.worldZ = point.z;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState]);
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let lastTime = performance.now();
    
    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      // Player movement
      const moveSpeed = 15 * deltaTime;
      let newX = player.position.x;
      let newZ = player.position.z;

      if (keysPressed.current['w']) newZ -= moveSpeed;
      if (keysPressed.current['s']) newZ += moveSpeed;
      if (keysPressed.current['a']) newX -= moveSpeed;
      if (keysPressed.current['d']) newX += moveSpeed;

      // Bounds checking
      newX = Math.max(-48, Math.min(48, newX));
      newZ = Math.max(-48, Math.min(48, newZ));

      // Rotate player to face mouse cursor
      const dx = mousePosition.current.worldX - newX;
      const dz = mousePosition.current.worldZ - newZ;
      const newRotation = Math.atan2(dx, dz);

      // Update player position and rotation
      if (playerMeshRef.current && !player.isDead) {
        playerMeshRef.current.position.x = newX;
        playerMeshRef.current.position.z = newZ;
        playerMeshRef.current.rotation.y = newRotation;

        // Death animation
        if (player.health <= 0 && !player.isDead) {
          setPlayer(prev => ({ ...prev, isDead: true, deathTime: currentTime }));
        }

        if (player.isDead) {
          const deathProgress = (currentTime - player.deathTime) / 2000;
          playerMeshRef.current.rotation.x = deathProgress * Math.PI / 2;
          playerMeshRef.current.position.y = -deathProgress * 2;
        }
      }
      
      // Camera follow
      if (cameraRef.current) {
        cameraRef.current.position.x = newX;
        cameraRef.current.position.z = newZ + 30;
        cameraRef.current.lookAt(newX, 0, newZ);
      }
      
      // Shooting - now follows mouse direction
      const fireRateCooldown = 500 / player.upgrades.fireRate;
      if (keysPressed.current[' '] && currentTime - lastShotTime.current > fireRateCooldown && !player.isDead) {
        shootTowardsMouse(newX, newZ, mousePosition.current.worldX, mousePosition.current.worldZ);
        lastShotTime.current = currentTime;
      }

      // Apply health decay if admin mode not enabled
      if (!adminConsole.noHealthDecay && player.health > 0) {
        setPlayer(prev => ({
          ...prev,
          health: Math.max(0, prev.health - 0.5 * deltaTime)
        }));
      }
      
      // Update enemies (AI)
      setEnemies(prevEnemies => prevEnemies.map(enemy => {
        const dx = player.position.x - enemy.position.x;
        const dz = player.position.z - enemy.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        // AI behavior
        if (enemy.aiState.behavior === 'aggressive' && distToPlayer < 30) {
          // Chase player
          const angle = Math.atan2(dz, dx);
          enemy.position.x += Math.cos(angle) * 8 * deltaTime;
          enemy.position.z += Math.sin(angle) * 8 * deltaTime;
          enemy.rotation = angle - Math.PI / 2;
          
          // Shoot at player
          if (currentTime - enemy.aiState.lastShot > 1000) {
            shootEnemy(enemy);
            enemy.aiState.lastShot = currentTime;
          }
        } else {
          // Random movement
          if (Math.random() < 0.02) {
            enemy.aiState.targetX = (Math.random() - 0.5) * 80;
            enemy.aiState.targetZ = (Math.random() - 0.5) * 80;
          }
          
          const tdx = enemy.aiState.targetX - enemy.position.x;
          const tdz = enemy.aiState.targetZ - enemy.position.z;
          const dist = Math.sqrt(tdx * tdx + tdz * tdz);
          
          if (dist > 2) {
            enemy.position.x += (tdx / dist) * 6 * deltaTime;
            enemy.position.z += (tdz / dist) * 6 * deltaTime;
            enemy.rotation = Math.atan2(tdz, tdx) - Math.PI / 2;
          }
        }
        
        // Bounds
        enemy.position.x = Math.max(-48, Math.min(48, enemy.position.x));
        enemy.position.z = Math.max(-48, Math.min(48, enemy.position.z));
        
        return enemy;
      }));
      
      // Update projectiles
      setProjectiles(prev => {
        return prev.map(proj => {
          proj.position.x += Math.cos(proj.direction) * proj.speed * deltaTime;
          proj.position.z += Math.sin(proj.direction) * proj.speed * deltaTime;
          proj.lifetime -= deltaTime;
          return proj;
        }).filter(proj => proj.lifetime > 0 && 
          Math.abs(proj.position.x) < 50 && 
          Math.abs(proj.position.z) < 50);
      });
      
      // Check collisions
      checkCollisions();
      
      // Update particles
      setParticles(prev => prev.map(p => ({
        ...p,
        lifetime: p.lifetime - deltaTime,
        position: {
          x: p.position.x + p.velocity.x * deltaTime,
          y: p.position.y + p.velocity.y * deltaTime,
          z: p.position.z + p.velocity.z * deltaTime
        }
      })).filter(p => p.lifetime > 0));
      
      setPlayer(prev => ({
        ...prev,
        position: { x: newX, y: 0, z: newZ },
        rotation: newRotation
      }));
      
      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameId.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, player, enemies, rocks, projectiles]);
  
  // Render rocks and enemies
  useEffect(() => {
    if (!sceneRef.current || gameState !== 'playing') return;
    
    // Clear old objects
    const objectsToRemove = [];
    sceneRef.current.children.forEach(child => {
      if (child.userData.isRock || child.userData.isEnemy || child.userData.isProjectile || child.userData.isParticle) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach(obj => sceneRef.current.remove(obj));
    
    // Render rocks
    rocks.forEach(rock => {
      const geometry = new THREE.DodecahedronGeometry(2, 0);
      const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(rock.position.x, 1, rock.position.z);
      mesh.rotation.y = rock.rotation;
      mesh.castShadow = true;
      mesh.userData.isRock = true;
      mesh.userData.id = rock.id;
      sceneRef.current.add(mesh);
    });
    
    // Render enemies as human characters
    enemies.forEach(enemy => {
      const group = new THREE.Group();

      // Body
      const bodyGeometry = new THREE.BoxGeometry(0.6, 1, 0.4);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: teams[enemy.team].color,
        roughness: 0.7
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.8
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.3;
      head.castShadow = true;
      group.add(head);

      // Arms
      const armGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
      leftArm.position.set(-0.5, 0.6, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
      rightArm.position.set(0.5, 0.6, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      // Legs
      const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
      const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8
      });

      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.2, -0.35, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.2, -0.35, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      group.position.set(enemy.position.x, 0, enemy.position.z);
      group.rotation.y = enemy.rotation;
      group.userData.isEnemy = true;
      group.userData.id = enemy.id;
      sceneRef.current.add(group);
    });
    
    // Render projectiles
    projectiles.forEach(proj => {
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: proj.color,
        emissive: proj.color,
        emissiveIntensity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(proj.position.x, 1, proj.position.z);
      mesh.userData.isProjectile = true;
      mesh.userData.id = proj.id;
      sceneRef.current.add(mesh);
    });
    
    // Render particles
    particles.forEach(particle => {
      const geometry = new THREE.SphereGeometry(0.2, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: particle.color,
        transparent: true,
        opacity: particle.lifetime / particle.maxLifetime
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(particle.position.x, particle.position.y, particle.position.z);
      mesh.userData.isParticle = true;
      sceneRef.current.add(mesh);
    });
    
  }, [rocks, enemies, projectiles, particles, gameState]);
  
  const shootTowardsMouse = (x, z, mouseX, mouseZ) => {
    // Calculate direction from player to mouse
    const dx = mouseX - x;
    const dz = mouseZ - z;
    const baseDirection = Math.atan2(dz, dx);

    const directions = ['front', ...player.upgrades.extraCannons];
    const newProjectiles = [];

    directions.forEach(dir => {
      let angleOffset = 0;
      if (dir === 'side') {
        [-Math.PI / 2, Math.PI / 2].forEach(offset => {
          newProjectiles.push(createProjectile(x, z, baseDirection + offset, true));
        });
        return;
      }
      if (dir === 'back') angleOffset = Math.PI;
      if (dir === 'diagonal') {
        [-Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4].forEach(offset => {
          newProjectiles.push(createProjectile(x, z, baseDirection + offset, true));
        });
        return;
      }

      newProjectiles.push(createProjectile(x, z, baseDirection + angleOffset, true));
    });

    setProjectiles(prev => [...prev, ...newProjectiles]);
  };

  const shoot = (x, z, rotation) => {
    const directions = ['front', ...player.upgrades.extraCannons];
    const newProjectiles = [];

    directions.forEach(dir => {
      let angleOffset = 0;
      if (dir === 'side') {
        [-Math.PI / 2, Math.PI / 2].forEach(offset => {
          newProjectiles.push(createProjectile(x, z, rotation + offset, true));
        });
        return;
      }
      if (dir === 'back') angleOffset = Math.PI;
      if (dir === 'diagonal') {
        [-Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4].forEach(offset => {
          newProjectiles.push(createProjectile(x, z, rotation + offset, true));
        });
        return;
      }

      newProjectiles.push(createProjectile(x, z, rotation + angleOffset, true));
    });

    setProjectiles(prev => [...prev, ...newProjectiles]);
  };
  
  const shootEnemy = (enemy) => {
    const proj = createProjectile(
      enemy.position.x,
      enemy.position.z,
      enemy.rotation + Math.PI / 2,
      false
    );
    setProjectiles(prev => [...prev, proj]);
  };
  
  const createProjectile = (x, z, direction, isPlayer) => ({
    id: Math.random(),
    position: { x, y: 1, z },
    direction,
    speed: 40,
    lifetime: 3,
    damage: isPlayer ? player.upgrades.damage * 10 : 10,
    color: isPlayer ? teams[selectedTeam].color : 0xff0000,
    isPlayerProjectile: isPlayer
  });
  
  const checkCollisions = () => {
    setProjectiles(prevProj => {
      const remaining = [...prevProj];
      
      prevProj.forEach(proj => {
        // Check rock collisions
        setRocks(prevRocks => {
          return prevRocks.map(rock => {
            const dx = proj.position.x - rock.position.x;
            const dz = proj.position.z - rock.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 2.5 && proj.isPlayerProjectile) {
              rock.health -= proj.damage;
              createParticles(rock.position.x, rock.position.z, 0x666666);
              
              const index = remaining.findIndex(p => p.id === proj.id);
              if (index !== -1) remaining.splice(index, 1);
              
              if (rock.health <= 0) {
                gainXP(20);
                return null;
              }
            }
            return rock;
          }).filter(Boolean);
        });
        
        // Check enemy collisions
        if (proj.isPlayerProjectile) {
          setEnemies(prevEnemies => {
            return prevEnemies.map(enemy => {
              const dx = proj.position.x - enemy.position.x;
              const dz = proj.position.z - enemy.position.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              
              if (dist < 2) {
                enemy.health -= proj.damage;
                createParticles(enemy.position.x, enemy.position.z, teams[enemy.team].color);
                
                const index = remaining.findIndex(p => p.id === proj.id);
                if (index !== -1) remaining.splice(index, 1);
                
                if (enemy.health <= 0) {
                  gainXP(50 * enemy.level);
                  return null;
                }
              }
              return enemy;
            }).filter(Boolean);
          });
        }
        
        // Check player collision with enemy projectiles
        if (!proj.isPlayerProjectile) {
          const dx = proj.position.x - player.position.x;
          const dz = proj.position.z - player.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < 2) {
            setPlayer(prev => ({
              ...prev,
              health: Math.max(0, prev.health - proj.damage)
            }));
            createParticles(player.position.x, player.position.z, teams[selectedTeam].color);
            
            const index = remaining.findIndex(p => p.id === proj.id);
            if (index !== -1) remaining.splice(index, 1);
          }
        }
      });
      
      return remaining;
    });
  };
  
  const createParticles = (x, z, color) => {
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        position: { x, y: 1, z },
        velocity: {
          x: (Math.random() - 0.5) * 10,
          y: Math.random() * 5,
          z: (Math.random() - 0.5) * 10
        },
        color,
        lifetime: 0.5,
        maxLifetime: 0.5
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };
  
  const gainXP = (amount) => {
    setPlayer(prev => {
      const newXP = prev.xp + amount;
      const requiredXP = getLevelRequirement(prev.level);
      
      if (newXP >= requiredXP) {
        return {
          ...prev,
          xp: newXP - requiredXP,
          level: prev.level + 1
        };
      }
      
      return { ...prev, xp: newXP };
    });
  };
  
  const applyUpgrade = (upgrade) => {
    setPlayer(prev => {
      const newUpgrades = { ...prev.upgrades };
      
      if (upgrade.type === 'damage') {
        newUpgrades.damage += 0.5;
      } else if (upgrade.type === 'fireRate') {
        newUpgrades.fireRate += 0.3;
      } else if (upgrade.type === 'extraCannons') {
        if (!newUpgrades.extraCannons.includes(upgrade.value)) {
          newUpgrades.extraCannons.push(upgrade.value);
        }
      } else if (upgrade.type === 'health') {
        return {
          ...prev,
          maxHealth: prev.maxHealth + 20,
          health: prev.health + 20,
          upgrades: newUpgrades
        };
      }
      
      return { ...prev, upgrades: newUpgrades };
    });
  };
  
  const startGame = () => {
    if (!playerName || !selectedTeam) return;
    setGameState('playing');
  };
  
  const respawn = () => {
    setPlayer(prev => ({
      ...prev,
      position: { x: 0, y: 0, z: 0 },
      health: prev.maxHealth,
      isDead: false,
      deathTime: 0
    }));
  };

  // Admin console command processing
  const executeAdminCommand = (command) => {
    const parts = command.trim().toLowerCase().split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case 'nohealthdecay':
      case 'godmode':
        setAdminConsole(prev => ({
          ...prev,
          noHealthDecay: !prev.noHealthDecay,
          command: ''
        }));
        console.log(`Health decay ${!adminConsole.noHealthDecay ? 'disabled' : 'enabled'}`);
        break;

      case 'levelup':
        const targetName = parts.slice(1).join(' ');
        if (!targetName) {
          // Level up the player
          setPlayer(prev => ({
            ...prev,
            level: prev.level + 1,
            xp: 0
          }));
          console.log('Player leveled up!');
        } else {
          // Level up specific enemy by name
          setEnemies(prev => prev.map(enemy => {
            if (enemy.name.toLowerCase() === targetName) {
              return { ...enemy, level: enemy.level + 1 };
            }
            return enemy;
          }));
          console.log(`Leveled up ${targetName}`);
        }
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      case 'addbot':
        const botTeam = parts[1] || Object.keys(teams)[Math.floor(Math.random() * Object.keys(teams).length)];
        const validTeam = teams[botTeam] ? botTeam : Object.keys(teams)[0];
        setEnemies(prev => [...prev, {
          id: Math.random(),
          name: `Bot ${Math.floor(Math.random() * 1000)}`,
          team: validTeam,
          position: {
            x: (Math.random() - 0.5) * 80,
            y: 0,
            z: (Math.random() - 0.5) * 80
          },
          rotation: Math.random() * Math.PI * 2,
          health: 100,
          maxHealth: 100,
          level: 1,
          aiState: {
            targetX: 0,
            targetZ: 0,
            lastShot: 0,
            behavior: Math.random() > 0.5 ? 'aggressive' : 'defensive'
          }
        }]);
        console.log(`Added bot on team ${validTeam}`);
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      case 'removebot':
        const botName = parts.slice(1).join(' ');
        if (botName) {
          setEnemies(prev => prev.filter(enemy =>
            enemy.name.toLowerCase() !== botName.toLowerCase()
          ));
          console.log(`Removed bot ${botName}`);
        } else {
          setEnemies(prev => prev.slice(0, -1));
          console.log('Removed last bot');
        }
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      case 'heal':
        setPlayer(prev => ({ ...prev, health: prev.maxHealth }));
        console.log('Player healed');
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      case 'clear':
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      case 'help':
        console.log('=== ADMIN COMMANDS ===');
        console.log('nohealthdecay / godmode - Toggle health decay');
        console.log('levelup [name] - Grant level up to player or bot');
        console.log('addbot [team] - Add a bot (red/blue/green)');
        console.log('removebot [name] - Remove bot by name or last bot');
        console.log('heal - Restore player health');
        console.log('clear - Clear command input');
        console.log('help - Show this help');
        setAdminConsole(prev => ({ ...prev, command: '' }));
        break;

      default:
        console.log(`Unknown command: ${cmd}. Type 'help' for commands.`);
        setAdminConsole(prev => ({ ...prev, command: '' }));
    }
  };
  
  useEffect(() => {
    if (player.health <= 0 && gameState === 'playing') {
      setTimeout(() => {
        respawn();
      }, 2000);
    }
  }, [player.health, gameState]);
  
  // Menu Screen
  if (gameState === 'menu') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #2a0a3e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Orbitron", sans-serif',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
        
        {/* Animated background */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
        
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff; }
            50% { text-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff, 0 0 40px #00ffff, 0 0 50px #00ffff; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
        
        <div style={{
          textAlign: 'center',
          zIndex: 1,
          animation: 'float 3s ease-in-out infinite'
        }}>
          <h1 style={{
            fontSize: '72px',
            fontWeight: 900,
            margin: '0 0 20px 0',
            animation: 'glow 2s ease-in-out infinite',
            letterSpacing: '8px',
            textTransform: 'uppercase'
          }}>
            NEXUS ARENA
          </h1>
          
          <p style={{
            fontSize: '20px',
            marginBottom: '50px',
            opacity: 0.8,
            letterSpacing: '4px'
          }}>
            SPACE COMBAT PLATFORM
          </p>
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid rgba(0, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            maxWidth: '500px',
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.2)'
          }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="ENTER CALLSIGN"
              maxLength={15}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                fontFamily: '"Orbitron", sans-serif',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '10px',
                color: '#00ffff',
                marginBottom: '30px',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                outline: 'none'
              }}
            />
            
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{
                fontSize: '24px',
                marginBottom: '20px',
                letterSpacing: '3px'
              }}>
                SELECT FACTION
              </h3>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {Object.entries(teams).map(([key, team]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTeam(key)}
                    style={{
                      padding: '20px 30px',
                      fontSize: '16px',
                      fontFamily: '"Orbitron", sans-serif',
                      fontWeight: 700,
                      background: selectedTeam === key
                        ? `linear-gradient(135deg, ${team.glowColor}, ${team.glowColor}88)`
                        : 'rgba(0, 0, 0, 0.5)',
                      border: `3px solid ${selectedTeam === key ? team.glowColor : 'rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '10px',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      boxShadow: selectedTeam === key
                        ? `0 0 20px ${team.glowColor}`
                        : 'none',
                      transform: selectedTeam === key ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={startGame}
              disabled={!playerName || !selectedTeam}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '24px',
                fontFamily: '"Orbitron", sans-serif',
                fontWeight: 900,
                background: playerName && selectedTeam
                  ? 'linear-gradient(135deg, #00ffff, #00aaff)'
                  : 'rgba(100, 100, 100, 0.5)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                cursor: playerName && selectedTeam ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                boxShadow: playerName && selectedTeam
                  ? '0 0 30px rgba(0, 255, 255, 0.5)'
                  : 'none',
                transition: 'all 0.3s'
              }}
            >
              {playerName && selectedTeam ? 'DEPLOY' : 'SELECT OPTIONS'}
            </button>
          </div>
          
          <div style={{
            marginTop: '40px',
            opacity: 0.6,
            fontSize: '14px',
            letterSpacing: '2px'
          }}>
            <p>CONTROLS: WASD - MOVE | ARROWS - ROTATE | SPACE - FIRE</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Game Screen
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        fontFamily: '"Orbitron", sans-serif',
        color: '#fff'
      }}>
        {/* Top HUD */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Player Info */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px 25px',
            borderRadius: '10px',
            border: `2px solid ${teams[selectedTeam].glowColor}`,
            boxShadow: `0 0 20px ${teams[selectedTeam].glowColor}88`
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '5px', color: teams[selectedTeam].glowColor }}>
              {playerName}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              {teams[selectedTeam].name}
            </div>
          </div>
          
          {/* Level and XP */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px 25px',
            borderRadius: '10px',
            border: '2px solid #00ffff',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              LEVEL {player.level}
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              height: '10px',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid #00ffff'
            }}>
              <div style={{
                height: '100%',
                width: `${(player.xp / getLevelRequirement(player.level)) * 100}%`,
                background: 'linear-gradient(90deg, #00ffff, #00aaff)',
                boxShadow: '0 0 10px #00ffff',
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
              {player.xp} / {getLevelRequirement(player.level)} XP
            </div>
          </div>
          
          {/* Health */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px 25px',
            borderRadius: '10px',
            border: '2px solid #ff0044',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              SHIELDS
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              height: '10px',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid #ff0044'
            }}>
              <div style={{
                height: '100%',
                width: `${(player.health / player.maxHealth) * 100}%`,
                background: player.health > 50
                  ? 'linear-gradient(90deg, #00ff00, #00aa00)'
                  : player.health > 25
                    ? 'linear-gradient(90deg, #ffaa00, #ff6600)'
                    : 'linear-gradient(90deg, #ff0044, #aa0022)',
                boxShadow: player.health > 50 ? '0 0 10px #00ff00' : '0 0 10px #ff0044',
                transition: 'width 0.3s, background 0.3s'
              }} />
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
              {Math.floor(player.health)} / {player.maxHealth}
            </div>
          </div>
        </div>
        
        {/* Upgrades Display */}
        <div style={{
          position: 'absolute',
          top: '120px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '15px',
          borderRadius: '10px',
          border: '2px solid #00ffff',
          maxWidth: '250px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
            LOADOUT
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            <div>Damage: {player.upgrades.damage.toFixed(1)}x</div>
            <div>Fire Rate: {player.upgrades.fireRate.toFixed(1)}x</div>
            <div>Cannons: {['front', ...player.upgrades.extraCannons].join(', ')}</div>
          </div>
        </div>
        
        {/* Minimap */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '200px',
          height: '200px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00ffff',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
        }}>
          <svg width="200" height="200" style={{ display: 'block' }}>
            {/* Grid */}
            <line x1="100" y1="0" x2="100" y2="200" stroke="#ffffff22" strokeWidth="1" />
            <line x1="0" y1="100" x2="200" y2="100" stroke="#ffffff22" strokeWidth="1" />
            
            {/* Player */}
            <circle
              cx={100 + (player.position.x / 50) * 100}
              cy={100 + (player.position.z / 50) * 100}
              r="5"
              fill={teams[selectedTeam].glowColor}
              stroke="#fff"
              strokeWidth="2"
            />
            
            {/* Enemies */}
            {enemies.map(enemy => (
              <circle
                key={enemy.id}
                cx={100 + (enemy.position.x / 50) * 100}
                cy={100 + (enemy.position.z / 50) * 100}
                r="3"
                fill={teams[enemy.team].glowColor}
                opacity="0.8"
              />
            ))}
            
            {/* Rocks */}
            {rocks.map(rock => (
              <rect
                key={rock.id}
                x={100 + (rock.position.x / 50) * 100 - 2}
                y={100 + (rock.position.z / 50) * 100 - 2}
                width="4"
                height="4"
                fill="#666"
                opacity="0.6"
              />
            ))}
          </svg>
        </div>
        
        {/* Enemy Count */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '15px 25px',
          borderRadius: '10px',
          border: '2px solid #ff0044',
          fontSize: '16px'
        }}>
          <div style={{ fontWeight: 700 }}>ENEMIES: {enemies.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '5px' }}>
            ROCKS: {rocks.length}
          </div>
        </div>
        
        {/* Death Screen */}
        {player.health <= 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            padding: '40px 60px',
            borderRadius: '20px',
            border: '3px solid #ff0044',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(255, 0, 68, 0.5)'
          }}>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#ff0044', marginBottom: '20px' }}>
              DESTROYED
            </div>
            <div style={{ fontSize: '20px', opacity: 0.8 }}>
              Respawning...
            </div>
          </div>
        )}
        
        {/* Level Up Notification */}
        {getAvailableUpgrades(player.level).length > 0 && player.xp < 100 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            padding: '40px',
            borderRadius: '20px',
            border: '3px solid #00ffff',
            pointerEvents: 'auto',
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.5)',
            maxWidth: '600px'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 900, marginBottom: '20px', color: '#00ffff' }}>
              LEVEL UP! - LEVEL {player.level}
            </div>
            
            <div style={{ marginBottom: '20px', fontSize: '18px', opacity: 0.8 }}>
              Select an upgrade:
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              {getAvailableUpgrades(player.level).slice(0, 3).map((upgrade, i) => (
                <button
                  key={i}
                  onClick={() => applyUpgrade(upgrade)}
                  style={{
                    padding: '20px',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '2px solid #00ffff',
                    borderRadius: '10px',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontFamily: '"Orbitron", sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>
                    {upgrade.name}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>
                    {upgrade.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Admin Console */}
        {adminConsole.isOpen && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            padding: '30px',
            borderRadius: '15px',
            border: '3px solid #ff00ff',
            pointerEvents: 'auto',
            boxShadow: '0 0 40px rgba(255, 0, 255, 0.5)',
            minWidth: '500px',
            maxWidth: '600px'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 900, marginBottom: '15px', color: '#ff00ff' }}>
              ADMIN CONSOLE
            </div>

            <div style={{ marginBottom: '15px', fontSize: '14px', opacity: 0.8 }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Available Commands:</strong>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6' }}>
                <div>• <strong>nohealthdecay</strong> or <strong>godmode</strong> - Toggle health decay</div>
                <div>• <strong>levelup [name]</strong> - Grant level up to player or bot</div>
                <div>• <strong>addbot [team]</strong> - Add bot (red/blue/green)</div>
                <div>• <strong>removebot [name]</strong> - Remove bot by name or last</div>
                <div>• <strong>heal</strong> - Restore player health</div>
                <div>• <strong>help</strong> - Show help in console</div>
              </div>
            </div>

            <div style={{ marginBottom: '15px', fontSize: '12px' }}>
              <div>Status: Health Decay <strong style={{ color: adminConsole.noHealthDecay ? '#00ff00' : '#ff0044' }}>
                {adminConsole.noHealthDecay ? 'DISABLED' : 'ENABLED'}
              </strong></div>
            </div>

            <input
              type="text"
              value={adminConsole.command}
              onChange={(e) => setAdminConsole(prev => ({ ...prev, command: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && adminConsole.command.trim()) {
                  executeAdminCommand(adminConsole.command);
                }
                if (e.key === 'Escape') {
                  setAdminConsole(prev => ({ ...prev, isOpen: false }));
                }
              }}
              placeholder="Enter command..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontFamily: 'monospace',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '2px solid #ff00ff',
                borderRadius: '8px',
                color: '#00ff00',
                outline: 'none'
              }}
            />

            <div style={{ marginTop: '10px', fontSize: '11px', opacity: 0.6 }}>
              Press ENTER to execute • ESC to close • P to toggle
            </div>
          </div>
        )}

        {/* Controls reminder */}
        <div style={{
          position: 'absolute',
          bottom: '240px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '12px',
          opacity: 0.6,
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div>WASD - Move</div>
          <div>MOUSE - Aim</div>
          <div>SPACE - Fire</div>
          <div>P - Admin Console</div>
        </div>
      </div>
    </div>
  );
};
