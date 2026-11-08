/**
 * Petros Scene Engine
 * Unified orchestrator for Three.js rendering, domain scene lifecycle,
 * camera transitions, resource disposal, and real-time business reactions.
 */

import * as THREE from 'three';
import { ResourceLoader } from './ResourceLoader';
import { LightingManager } from './LightingManager';
import { CameraController } from './CameraController';
import { QualityManager, QualityTier } from './QualityProfile';
import { BusinessDomain } from '../business/types';
import { DOMAIN_MANIFESTS } from '../business/BusinessWorldManager';
import { CampusSceneBuilder } from '../scenes/CampusSceneBuilder';
import { AgencySceneBuilder } from '../scenes/AgencySceneBuilder';
import { CommerceSceneBuilder } from '../scenes/CommerceSceneBuilder';
import { ContentSceneBuilder } from '../scenes/ContentSceneBuilder';
import { ResearchSceneBuilder } from '../scenes/ResearchSceneBuilder';
import { BusinessEventGateway } from '../events/BusinessEventGateway';
import { BusinessEvent } from '../events/eventTypes';

export class SceneEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lighting: LightingManager;
  private cameraController: CameraController;
  private qualityManager: QualityManager;
  private resourceLoader: ResourceLoader;
  private eventGateway: BusinessEventGateway;

  private currentDomain: BusinessDomain | null = null;
  private currentRoomId: string | null = null;
  private activeDomainGroup: THREE.Group | null = null;
  private domainReactions: ((e: BusinessEvent) => void)[] = [];
  private unsubscribeGateway: (() => void) | null = null;

  private isRunning: boolean = true;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = performance.now();

  constructor(container: HTMLElement, initialQuality: QualityTier = 'balanced') {
    this.container = container;
    this.qualityManager = new QualityManager(initialQuality);
    this.resourceLoader = ResourceLoader.getInstance();
    this.eventGateway = BusinessEventGateway.getInstance();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdde8f3);
    this.scene.fog = new THREE.FogExp2(0xdde8f3, 0.007);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 400);
    this.camera.position.set(26, 18, 32);

    // 2. Renderer with PBR tone mapping & soft shadows
    const quality = this.qualityManager.getSettings();
    this.renderer = new THREE.WebGLRenderer({
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.shadowMap.enabled = quality.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // 3. Lighting & Camera Controller
    this.lighting = new LightingManager();
    this.scene.add(this.lighting.getGroup());

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // 4. Subscriptions & Window APIs
    this.setupEventSubscription();
    this.setupWindowAPIs();

    // 5. Start RAF
    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  public async switchDomain(domain: BusinessDomain, roomId?: string): Promise<void> {
    if (this.currentDomain === domain && !roomId) return;

    const manifest = DOMAIN_MANIFESTS[domain];
    if (!manifest) return;

    // 1. Clean up existing domain scene and dispose WebGL resources
    if (this.activeDomainGroup) {
      this.scene.remove(this.activeDomainGroup);
      ResourceLoader.disposeHierarchy(this.activeDomainGroup);
      this.activeDomainGroup = null;
    }
    this.domainReactions = [];

    this.currentDomain = domain;
    const targetRoomId = roomId || manifest.defaultRoom;
    this.currentRoomId = targetRoomId;

    const room = manifest.rooms.find((r) => r.id === targetRoomId) || manifest.rooms[0];

    // 2. Configure Lighting and Fog for Domain
    if (domain === 'campus') {
      this.scene.background = new THREE.Color(0xdde8f3);
      this.scene.fog = new THREE.FogExp2(0xdde8f3, 0.007);
      this.lighting.configureExteriorDaylight();
    } else {
      this.scene.background = new THREE.Color(0x0c0d12);
      this.scene.fog = new THREE.FogExp2(0x0c0d12, 0.015);
      this.lighting.configureInteriorStudio(domain);
    }

    // 3. Build the selected domain scene
    const reactionRegister = (handler: (e: BusinessEvent) => void) => {
      this.domainReactions.push(handler);
    };

    let newGroup: THREE.Group;
    switch (domain) {
      case 'agency':
        newGroup = await AgencySceneBuilder.build(this.scene, this.resourceLoader, reactionRegister);
        break;
      case 'commerce':
        newGroup = await CommerceSceneBuilder.build(this.scene, this.resourceLoader, reactionRegister);
        break;
      case 'content':
        newGroup = await ContentSceneBuilder.build(this.scene, this.resourceLoader, reactionRegister);
        break;
      case 'research':
        newGroup = await ResearchSceneBuilder.build(this.scene, this.resourceLoader, reactionRegister);
        break;
      case 'campus':
      default:
        newGroup = await CampusSceneBuilder.build(this.scene, this.resourceLoader);
        break;
    }

    this.activeDomainGroup = newGroup;

    // 4. Glide camera to initial room pose
    if (room && room.cameraPose) {
      this.cameraController.glideTo(room.cameraPose);
    }
  }

  public switchRoom(roomId: string): void {
    if (!this.currentDomain) return;
    const manifest = DOMAIN_MANIFESTS[this.currentDomain];
    if (!manifest) return;

    const room = manifest.rooms.find((r) => r.id === roomId);
    if (!room) return;

    this.currentRoomId = roomId;
    this.cameraController.glideTo(room.cameraPose);
  }

  public setQuality(tier: QualityTier): void {
    const settings = this.qualityManager.setTier(tier);
    this.renderer.setPixelRatio(settings.pixelRatio);
    this.renderer.shadowMap.enabled = settings.shadowsEnabled;
  }

  private setupEventSubscription(): void {
    this.unsubscribeGateway = this.eventGateway.subscribe((event: BusinessEvent) => {
      for (const reaction of this.domainReactions) {
        try {
          reaction(event);
        } catch (err) {
          console.error('[SceneEngine] Domain reaction error:', err);
        }
      }
    });
  }

  private setupWindowAPIs(): void {
    (window as any).__petrosEngine = this;
    (window as any).__petrosSetDomain = (domain: BusinessDomain) => this.switchDomain(domain);
    (window as any).__petrosSetRoom = (roomId: string) => this.switchRoom(roomId);
    (window as any).__petrosPause = () => {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    };
    (window as any).__petrosAnimate = () => {
      if (!this.isRunning) {
        this.isRunning = true;
        this.animationFrameId = requestAnimationFrame(this.animate);
      }
    };
    (window as any).__petrosCancel = () => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    };
    (window as any).__petrosEmitEvent = (event: BusinessEvent) => {
      this.eventGateway.publish(event);
    };
  }

  private animate(time?: number): void {
    if (!this.isRunning) return;
    const now = typeof time === 'number' ? time : performance.now();
    const delta = Math.min(Math.max((now - this.lastFrameTime) / 1000, 0.001), 0.1);
    this.lastFrameTime = now;

    this.cameraController.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private handleResize(): void {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.unsubscribeGateway) {
      this.unsubscribeGateway();
    }
    if (this.activeDomainGroup) {
      this.scene.remove(this.activeDomainGroup);
      ResourceLoader.disposeHierarchy(this.activeDomainGroup);
    }
    this.cameraController.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
