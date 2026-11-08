import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type WorldEnvironment = 'void' | 'commerce' | 'engineering' | 'agency' | 'research';

interface Props {
  environment: WorldEnvironment;
  isExecuting?: boolean;
  onObjectClick?: (objectId: string) => void;
  hoveredNodeId?: string | null;
  onHoverNode?: (nodeId: string | null) => void;
  activeMode?: 'normal' | 'holographic';
}

interface InteractiveObject {
  id: string;
  name: string;
  mesh: THREE.Object3D;
  environment: WorldEnvironment;
  description: string;
}

/**
 * Procedural Architectural Plaza Paver Texture Generator
 * Generates high-resolution limestone paving slabs with realistic mortar joints
 */
function createPlazaPaverTextures() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm architectural limestone base
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(0, 0, size, size);

  // Subtle stone grain noise
  for (let i = 0; i < 4000; i++) {
    const nx = Math.random() * size;
    const ny = Math.random() * size;
    const gray = 195 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.25)`;
    ctx.fillRect(nx, ny, 2, 2);
  }

  // Realistic paver tile joints
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 3;
  const stepX = 64;
  const stepY = 32;

  let row = 0;
  for (let y = 0; y <= size; y += stepY) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    const offset = (row % 2) * (stepX / 2);
    for (let x = offset; x <= size; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + stepY);
      ctx.stroke();
    }
    row++;
  }

  const colorTexture = new THREE.CanvasTexture(canvas);
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.repeat.set(16, 16);

  // Roughness Map (paver tiles = 0.55, mortar joints = 0.85)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#8c8c8c';
  rCtx.fillRect(0, 0, size, size);

  rCtx.strokeStyle = '#d6d6d6';
  rCtx.lineWidth = 3;
  row = 0;
  for (let y = 0; y <= size; y += stepY) {
    rCtx.beginPath();
    rCtx.moveTo(0, y);
    rCtx.lineTo(size, y);
    rCtx.stroke();

    const offset = (row % 2) * (stepX / 2);
    for (let x = offset; x <= size; x += stepX) {
      rCtx.beginPath();
      rCtx.moveTo(x, y);
      rCtx.lineTo(x, y + stepY);
      rCtx.stroke();
    }
    row++;
  }

  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.repeat.set(16, 16);

  return { colorTexture, roughnessTexture };
}

/**
 * Procedural Manicured Courtyard Lawn Texture Generator
 */
function createLawnTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep rich turf base
  ctx.fillStyle = '#2f5233';
  ctx.fillRect(0, 0, size, size);

  // Natural grass flecks and blade variation
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 80 + Math.floor(Math.random() * 50);
    const r = 35 + Math.floor(Math.random() * 25);
    const b = 30 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, 1.5, 3.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
}

/**
 * Realistic Architectural Sky Dome Shader
 */
function createSkyDome() {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      // Soft transition from pale horizon haze up to crisp architectural sky blue
      vec3 skyTop = vec3(0.24, 0.46, 0.82);      // Zenith blue
      vec3 horizon = vec3(0.85, 0.91, 0.97);     // Horizon mist
      vec3 groundFade = vec3(0.80, 0.86, 0.90);  // Lower haze
      
      vec3 color = mix(horizon, skyTop, max(pow(max(h, 0.0), 0.55), 0.0));
      if (h < 0.0) {
        color = mix(horizon, groundFade, min(-h * 4.0, 1.0));
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const skyGeo = new THREE.SphereGeometry(140, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(skyGeo, skyMat);
}

export function PetrosWorldCanvas({
  environment = 'void',
  isExecuting = false,
  onObjectClick,
  hoveredNodeId = null,
  onHoverNode,
  activeMode = 'holographic',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const interactiveObjectsRef = useRef<InteractiveObject[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
  const isExecutingRef = useRef<boolean>(isExecuting);
  const activeModeRef = useRef<'normal' | 'holographic'>(activeMode);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Preset cinematic vantage points per environment
  const cameraVantagePoints: Record<WorldEnvironment, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
    // Arrival View: Courtyard wide panorama looking across fountain to Headquarters entrance
    void: { pos: new THREE.Vector3(0, 4.8, 16.5), look: new THREE.Vector3(0, 2.6, -3.5) },
    // Main Entrance Portal View: Close-up right at the revolving glass entrance
    agency: { pos: new THREE.Vector3(0, 2.0, 0.4), look: new THREE.Vector3(0, 1.8, -4.0) },
    // West Wing View: Engineering Lab Wing (unobstructed framing)
    engineering: { pos: new THREE.Vector3(-4.5, 3.5, 5.0), look: new THREE.Vector3(-14.5, 2.8, -6.0) },
    // East Wing View: Commerce Center Wing (unobstructed framing)
    commerce: { pos: new THREE.Vector3(4.5, 3.5, 5.0), look: new THREE.Vector3(14.5, 2.8, -6.0) },
    // Courtyard Plaza Fountain View: Central social/research space
    research: { pos: new THREE.Vector3(0, 2.2, 8.5), look: new THREE.Vector3(0, 1.4, 4.5) },
  };

  const cameraTargetRef = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 }>(cameraVantagePoints.void);
  const isTransitioningRef = useRef<boolean>(true);
  const userInteractedRef = useRef<boolean>(false);

  useEffect(() => {
    isExecutingRef.current = isExecuting;
  }, [isExecuting]);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    const target = cameraVantagePoints[environment] || cameraVantagePoints.void;
    cameraTargetRef.current = target;
    isTransitioningRef.current = true;
    userInteractedRef.current = false;
  }, [environment]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0xe0f2fe, 0.008);

    // 2. CAMERA SETUP
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 200);
    camera.position.set(0, 3.8, 14.5);
    cameraRef.current = camera;

    // 3. RENDERER SETUP (Apple-grade physical realism)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. ORBIT CONTROLS (Full User Interactivity)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never go under ground
    controls.minDistance = 1.8;
    controls.maxDistance = 45.0;
    controls.target.set(0, 2.0, -4.0);
    controlsRef.current = controls;

    // Detect user manual interaction to pause automated glide
    controls.addEventListener('start', () => {
      userInteractedRef.current = true;
      isTransitioningRef.current = false;
    });

    // 5. NATURAL ARCHITECTURAL SKY & LIGHTING
    const skyDome = createSkyDome();
    scene.add(skyDome);

    // Daylight Architectural Sun
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(24, 38, 26);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -26;
    sunLight.shadow.camera.right = 26;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -26;
    sunLight.shadow.bias = -0.00015;
    scene.add(sunLight);

    // Natural Sky & Turf Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x70a5e8, 0x486b40, 1.15);
    scene.add(hemiLight);

    // Ambient Fill Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Entrance Warm Architectural Canopy Light
    const entranceLight = new THREE.PointLight(0xffecd2, 1.8, 12);
    entranceLight.position.set(0, 3.8, -3.8);
    scene.add(entranceLight);

    // Fountain Sparkling Water Accent Light
    const fountainLight = new THREE.PointLight(0x67e8f9, 1.2, 7);
    fountainLight.position.set(0, 1.6, 4.5);
    scene.add(fountainLight);

    // 6. REALISTIC GROUND & COURTYARD PAVING
    const { colorTexture: paverColor, roughnessTexture: paverRough } = createPlazaPaverTextures();
    const lawnTexture = createLawnTexture();

    // Outer Lush Lawn Ground
    const lawnGeo = new THREE.PlaneGeometry(130, 130);
    const lawnMat = new THREE.MeshStandardMaterial({
      map: lawnTexture,
      roughness: 0.9,
      metalness: 0.02,
      color: 0x4b784a,
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.05;
    lawn.receiveShadow = true;
    scene.add(lawn);

    // Central Paved Courtyard Plaza
    const plazaGeo = new THREE.PlaneGeometry(34, 32);
    const plazaMat = new THREE.MeshStandardMaterial({
      map: paverColor,
      roughnessMap: paverRough,
      roughness: 0.55,
      metalness: 0.12,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.0, 1.0);
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Granite Curb Edging
    const curbGeo = new THREE.BoxGeometry(34.4, 0.12, 32.4);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.6,
      metalness: 0.1,
    });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, -0.04, 1.0);
    curb.receiveShadow = true;
    scene.add(curb);

    // Entrance Paved Promenade Walkway
    const walkwayGeo = new THREE.PlaneGeometry(8, 6);
    const walkway = new THREE.Mesh(walkwayGeo, plazaMat);
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.set(0, 0.01, -3.0);
    walkway.receiveShadow = true;
    scene.add(walkway);

    // 7. GLTF ASSET LOADING (REAL OPEN-SOURCE ARCHITECTURE)
    const interactiveObjects: InteractiveObject[] = [];
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (_, loaded, total) => {
      setLoadProgress(Math.round((loaded / total) * 100));
    };
    loadingManager.onLoad = () => {
      setIsLoaded(true);
    };

    const gltfLoader = new GLTFLoader(loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    const assetModels: {
      url: string;
      onLoad: (gltf: any) => void;
    }[] = [
      // A. MAIN TECHNOLOGY HEADQUARTERS TOWER (42m multi-story glass/steel facade)
      {
        url: '/models/campus/monolith-office-tower.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 1.0, -12.0);
          model.scale.set(1.0, 1.0, 1.0);
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);
        },
      },
      // B. ARCHITECTURAL ENTRANCE BAY (Revolving glass doors with canopy)
      {
        url: '/models/campus/revolving-entrance-bay.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 1.0, -4.0);
          model.scale.set(1.15, 1.15, 1.15);
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);

          interactiveObjects.push({
            id: 'agency-squad',
            name: 'Petros HQ Main Entrance',
            mesh: model,
            environment: 'agency',
            description: 'Central portal to Petros Multi-Agent Operations and Executive Control.',
          });
        },
      },
      // C. WEST WING: ENGINEERING LAB TOWER
      {
        url: '/models/campus/office-tower.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.position.set(-14.5, 1.0, -6.5);
          model.rotation.y = Math.PI / 12;
          model.scale.set(0.95, 0.95, 0.95);
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);

          interactiveObjects.push({
            id: 'app-factory-compiler',
            name: 'Engineering Laboratory Wing',
            mesh: model,
            environment: 'engineering',
            description: 'Autonomous compiler reactor, software architecture, and desktop builds.',
          });

          // Clone East Wing: Commerce Center Wing
          const eastModel = model.clone(true);
          eastModel.position.set(14.5, 1.0, -6.5);
          eastModel.rotation.y = -Math.PI / 12;
          scene.add(eastModel);

          interactiveObjects.push({
            id: 'commerce-storefront',
            name: 'Commerce Center Wing',
            mesh: eastModel,
            environment: 'commerce',
            description: 'E-commerce showroom, catalog systems, and transaction pipelines.',
          });
        },
      },
      // D. CENTRAL PLAZA FOUNTAIN
      {
        url: '/models/campus/campus-plaza-fountain.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 1.0, 4.5);
          model.scale.set(1.1, 1.1, 1.1);
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);

          interactiveObjects.push({
            id: 'laya-core',
            name: 'Courtyard Plaza Fountain',
            mesh: model,
            environment: 'void',
            description: 'Central gathering quadrangle and collaborative campus heart.',
          });
        },
      },
      // E. LANDSCAPING: BROAD CANOPY SHADE TREES
      {
        url: '/models/campus/broad-canopy-tree.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const treeCoords = [
            { pos: [-12.0, 1.0, 1.5], scale: 1.05, rot: 0.2 },
            { pos: [12.0, 1.0, 1.5], scale: 1.0, rot: 1.5 },
            { pos: [-10.5, 1.0, 11.5], scale: 0.95, rot: 2.8 },
            { pos: [10.5, 1.0, 11.5], scale: 1.1, rot: 4.1 },
          ];

          treeCoords.forEach(({ pos, scale, rot }) => {
            const tree = model.clone(true);
            tree.position.set(pos[0], pos[1], pos[2]);
            tree.scale.set(scale, scale, scale);
            tree.rotation.y = rot;
            scene.add(tree);
          });
        },
      },
      // F. COURTYARD TREES IN PIT GRATES
      {
        url: '/models/campus/tree-in-pit-grate.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const grateCoords = [
            { pos: [-4.5, 1.0, -2.0], rot: 0.4 },
            { pos: [4.5, 1.0, -2.0], rot: 2.1 },
            { pos: [-5.0, 1.0, 7.5], rot: 1.2 },
            { pos: [5.0, 1.0, 7.5], rot: 3.5 },
          ];

          grateCoords.forEach(({ pos, rot }) => {
            const grateTree = model.clone(true);
            grateTree.position.set(pos[0], pos[1], pos[2]);
            grateTree.rotation.y = rot;
            scene.add(grateTree);
          });
        },
      },
      // G. COURTYARD SEATING BENCHES
      {
        url: '/models/campus/campus-bench.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const benchCoords = [
            { pos: [-3.2, 1.0, 4.5], rot: Math.PI / 2 },
            { pos: [3.2, 1.0, 4.5], rot: -Math.PI / 2 },
            { pos: [0, 1.0, 1.8], rot: 0 },
            { pos: [0, 1.0, 7.2], rot: Math.PI },
          ];

          benchCoords.forEach(({ pos, rot }) => {
            const bench = model.clone(true);
            bench.position.set(pos[0], pos[1], pos[2]);
            bench.rotation.y = rot;
            scene.add(bench);
          });
        },
      },
      // H. ARCHITECTURAL CAMPUS LAMP POSTS
      {
        url: '/models/campus/campus-lamp-post.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const lampCoords = [
            [-3.5, 1.0, -2.8],
            [3.5, 1.0, -2.8],
            [-3.5, 1.0, 1.2],
            [3.5, 1.0, 1.2],
            [-3.5, 1.0, 6.8],
            [3.5, 1.0, 6.8],
          ];

          lampCoords.forEach(([x, y, z]) => {
            const lamp = model.clone(true);
            lamp.position.set(x, y, z);
            scene.add(lamp);
          });
        },
      },
      // I. ENTRANCE PLANTER BOXES
      {
        url: '/models/campus/campus-planter-box.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const planter1 = model.clone(true);
          planter1.position.set(-2.8, 1.0, -3.8);
          scene.add(planter1);

          const planter2 = model.clone(true);
          planter2.position.set(2.8, 1.0, -3.8);
          scene.add(planter2);
        },
      },
      // J. CAMPUS DIRECTORY & WAYFINDING TOTEM
      {
        url: '/models/campus/campus-map-board.glb',
        onLoad: (gltf) => {
          const model = gltf.scene;
          model.position.set(3.6, 1.0, 8.2);
          model.rotation.y = -Math.PI / 5;
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);

          interactiveObjects.push({
            id: 'commerce-economics',
            name: 'Campus Directory & Wayfinding Totem',
            mesh: model,
            environment: 'commerce',
            description: 'Campus master plan, room navigation, and unit economics.',
          });
        },
      },
    ];

    // Trigger asynchronous model loading
    assetModels.forEach(({ url, onLoad }) => {
      gltfLoader.load(
        url,
        (gltf) => {
          onLoad(gltf);
        },
        undefined,
        (error) => {
          console.warn(`[Campus 3D] Failed to load ${url}:`, error);
        }
      );
    });

    interactiveObjectsRef.current = interactiveObjects;

    // 8. MOUSE & CLICK INTERACTIONS
    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.set(x, y);

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes = interactiveObjects.map((o) => o.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const found = interactiveObjects.find((o) => {
          let cur: THREE.Object3D | null = hit;
          while (cur) {
            if (cur === o.mesh) return true;
            cur = cur.parent;
          }
          return false;
        });

        if (found) {
          container.style.cursor = 'pointer';
          if (onHoverNode) onHoverNode(found.id);
          return;
        }
      }
      container.style.cursor = 'default';
      if (onHoverNode) onHoverNode(null);
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const clickMouse = new THREE.Vector2(x, y);

      raycasterRef.current.setFromCamera(clickMouse, camera);
      const meshes = interactiveObjects.map((o) => o.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const found = interactiveObjects.find((o) => {
          let cur: THREE.Object3D | null = hit;
          while (cur) {
            if (cur === o.mesh) return true;
            cur = cur.parent;
          }
          return false;
        });

        if (found && onObjectClick) {
          onObjectClick(found.id);
        }
      }
    };

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);
    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('click', onClick);

    // 9. ANIMATION LOOP (Apple Spring Physics & Camera Glide)
    let animId: number;
    const clock = new THREE.Clock();
    let isTabVisible = !document.hidden;

    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        clock.getDelta();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Expose helpers for deterministic verification & screenshot capture
    (window as any).__petrosSetRoom = (env: WorldEnvironment) => {
      const target = cameraVantagePoints[env] || cameraVantagePoints.void;
      camera.position.copy(target.pos);
      controls.target.copy(target.look);
      camera.lookAt(target.look);
      controls.update();
      renderer.render(scene, camera);
    };
    (window as any).__petrosCancel = () => cancelAnimationFrame(animId);

    const animate = () => {
      (window as any).__petrosAnimate = animate;
      animId = requestAnimationFrame(animate);

      // Save 100% resources if hidden or in normal mode
      if (!isTabVisible || activeModeRef.current === 'normal') {
        return;
      }

      if ((window as any).__petrosPause) {
        renderer.render(scene, camera);
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.1);

      // Automated camera glide when switching rooms (unless user actively orbits)
      if (isTransitioningRef.current && !userInteractedRef.current) {
        const target = cameraTargetRef.current;
        const springDamp = 1.0 - Math.exp(-4.5 * delta);

        camera.position.lerp(target.pos, springDamp);
        controls.target.lerp(target.look, springDamp);
        camera.lookAt(controls.target);

        if (
          camera.position.distanceTo(target.pos) < 0.05 &&
          controls.target.distanceTo(target.look) < 0.05
        ) {
          camera.position.copy(target.pos);
          controls.target.copy(target.look);
          camera.lookAt(controls.target);
          isTransitioningRef.current = false;
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. CLEANUP
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('click', onClick);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      paverColor.dispose();
      paverRough.dispose();
      lawnTexture.dispose();
      dracoLoader.dispose();
      controls.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-auto transition-opacity duration-700 ease-out ${
        activeMode === 'holographic' ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ background: '#02040A' }}
    >
      {/* Subtle architectural loading indicator */}
      {!isLoaded && activeMode === 'holographic' && (
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-slate-300">
          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>بارگذاری محیط پردیس سه‌بعدی ({loadProgress}%)</span>
        </div>
      )}
    </div>
  );
}
