/**
 * Petros Camera Controller
 * Handles smooth cinematic glides, focal point transitions, and bounds-clamped orbit controls.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  duration?: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isTransitioning: boolean = false;

  private startPos: THREE.Vector3 = new THREE.Vector3();
  private targetPos: THREE.Vector3 = new THREE.Vector3();
  private startLookAt: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();

  private transitionStartTime: number = 0;
  private transitionDuration: number = 1.4; // seconds

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.setupControls();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never dip below floor
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 140;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.9;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public glideTo(pose: CameraPose): void {
    this.startPos.copy(this.camera.position);
    this.targetPos.copy(pose.position);

    this.startLookAt.copy(this.controls.target);
    this.targetLookAt.copy(pose.target);

    this.transitionDuration = pose.duration || 1.35;
    this.transitionStartTime = performance.now();
    this.isTransitioning = true;
    this.controls.enabled = false;
  }

  public update(): void {
    if (this.isTransitioning) {
      const elapsed = (performance.now() - this.transitionStartTime) / 1000;
      const progress = Math.min(1, elapsed / this.transitionDuration);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(this.startPos, this.targetPos, eased);
      this.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, eased);
      this.camera.lookAt(this.controls.target);

      if (progress >= 1) {
        this.isTransitioning = false;
        this.controls.enabled = true;
        this.controls.update();
      }
    } else {
      this.controls.update();
    }
  }

  public immediatePose(pose: CameraPose): void {
    this.isTransitioning = false;
    this.controls.enabled = true;
    this.camera.position.copy(pose.position);
    this.controls.target.copy(pose.target);
    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
