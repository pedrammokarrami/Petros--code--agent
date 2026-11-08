/**
 * Petros Camera Controller
 * Production-grade cinematic camera controller featuring:
 * - Frame-rate independent critically damped spring interpolation (SmoothDamp)
 * - Seamless mid-flight retargeting preserving 3D momentum across rapid clicks
 * - Continuous OrbitControls spherical-coordinate synchronization (zero snapping)
 * - Touch-optimized mobile interaction for iOS Safari (iPhone 15 Pro Max)
 * - User gesture interruption with smooth transition yielding
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
  private domElement: HTMLElement;
  public isTransitioning: boolean = false;

  // Target positions and orientations
  private targetPos: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();

  // Momentum velocities for C1-continuous SmoothDamp
  private velocityPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private velocityLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Damping configuration
  private smoothTime: number = 0.52; // Golden-ratio spring damping time (seconds)
  private maxSpeed: number = 95.0; // Max units/sec to prevent nauseating acceleration

  // Interruption listener cleanup
  private onUserControlStart: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.controls = new OrbitControls(camera, domElement);

    this.currentLookAt.copy(this.controls.target);
    this.targetPos.copy(camera.position);
    this.targetLookAt.copy(this.controls.target);

    this.onUserControlStart = () => {
      if (this.isTransitioning) {
        this.cancelGlide();
      }
    };

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

    // Mobile touch gestures for iPhone 15 Pro Max Safari
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Prevent iOS Safari pull-to-refresh and native scroll gesture hijacking
    if (this.domElement) {
      this.domElement.style.touchAction = 'none';
      (this.domElement.style as any).webkitTouchCallout = 'none';
      this.domElement.style.userSelect = 'none';
      (this.domElement.style as any).webkitUserSelect = 'none';
    }

    // Gracefully yield transition when user manually interacts
    this.controls.addEventListener('start', this.onUserControlStart);
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Smoothly glide camera to target pose.
   * If a glide is already in progress, preserves momentum without snapping or stopping.
   */
  public glideTo(pose: CameraPose): void {
    this.targetPos.copy(pose.position);
    this.targetLookAt.copy(pose.target);

    // Calculate dynamic smooth time based on requested duration
    if (pose.duration && pose.duration > 0) {
      this.smoothTime = Math.max(0.32, Math.min(0.85, pose.duration * 0.42));
    } else {
      this.smoothTime = 0.52;
    }

    this.isTransitioning = true;
    // Disable user input during glide while keeping OrbitControls internally updated
    this.controls.enabled = false;
  }

  /**
   * Critically Damped Spring solver (SmoothDamp)
   * Evaluates exact C1 continuous exponential smoothing per axis
   */
  private smoothDampVector3(
    current: THREE.Vector3,
    target: THREE.Vector3,
    currentVelocity: THREE.Vector3,
    smoothTime: number,
    maxSpeed: number,
    deltaTime: number
  ): void {
    const st = Math.max(0.0001, smoothTime);
    const omega = 2.0 / st;
    const x = omega * deltaTime;
    const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

    let changeX = current.x - target.x;
    let changeY = current.y - target.y;
    let changeZ = current.z - target.z;

    // Clamp maximum change to cap speed
    const maxChange = maxSpeed * st;
    const sqDist = changeX * changeX + changeY * changeY + changeZ * changeZ;
    if (sqDist > maxChange * maxChange) {
      const dist = Math.sqrt(sqDist);
      changeX = (changeX / dist) * maxChange;
      changeY = (changeY / dist) * maxChange;
      changeZ = (changeZ / dist) * maxChange;
    }

    const clampedTargetX = current.x - changeX;
    const clampedTargetY = current.y - changeY;
    const clampedTargetZ = current.z - changeZ;

    const tempX = (currentVelocity.x + omega * changeX) * deltaTime;
    const tempY = (currentVelocity.y + omega * changeY) * deltaTime;
    const tempZ = (currentVelocity.z + omega * changeZ) * deltaTime;

    currentVelocity.x = (currentVelocity.x - omega * tempX) * exp;
    currentVelocity.y = (currentVelocity.y - omega * tempY) * exp;
    currentVelocity.z = (currentVelocity.z - omega * tempZ) * exp;

    let outputX = clampedTargetX + (changeX + tempX) * exp;
    let outputY = clampedTargetY + (changeY + tempY) * exp;
    let outputZ = clampedTargetZ + (changeZ + tempZ) * exp;

    // Prevent overshooting the target position
    const origMinusTargetX = target.x - current.x;
    const origMinusTargetY = target.y - current.y;
    const origMinusTargetZ = target.z - current.z;
    const outMinusTargetX = outputX - target.x;
    const outMinusTargetY = outputY - target.y;
    const outMinusTargetZ = outputZ - target.z;

    if (
      origMinusTargetX * outMinusTargetX +
        origMinusTargetY * outMinusTargetY +
        origMinusTargetZ * outMinusTargetZ >
      0
    ) {
      outputX = target.x;
      outputY = target.y;
      outputZ = target.z;
      currentVelocity.set(0, 0, 0);
    }

    current.set(outputX, outputY, outputZ);
  }

  /**
   * Per-frame update step with exact delta time
   */
  public update(deltaTime: number = 0.0166): void {
    // Clamp delta time to avoid huge teleportation jumps if tab switches
    const dt = Math.max(0.001, Math.min(deltaTime, 0.066));

    if (this.isTransitioning) {
      // 1. Smoothly interpolate position and lookAt target simultaneously
      this.smoothDampVector3(
        this.camera.position,
        this.targetPos,
        this.velocityPos,
        this.smoothTime,
        this.maxSpeed,
        dt
      );

      this.smoothDampVector3(
        this.currentLookAt,
        this.targetLookAt,
        this.velocityLookAt,
        this.smoothTime,
        this.maxSpeed,
        dt
      );

      // 2. Synchronize OrbitControls target & camera orientation
      this.controls.target.copy(this.currentLookAt);
      this.camera.lookAt(this.controls.target);

      // 3. Keep OrbitControls spherical state in continuous sync
      this.controls.update();

      // 4. Check for smooth arrival threshold
      const posDist = this.camera.position.distanceTo(this.targetPos);
      const lookDist = this.currentLookAt.distanceTo(this.targetLookAt);
      const posSpeed = this.velocityPos.length();
      const lookSpeed = this.velocityLookAt.length();

      if (posDist < 0.015 && lookDist < 0.015 && posSpeed < 0.08 && lookSpeed < 0.08) {
        // Snap to exact target coordinates on finish
        this.camera.position.copy(this.targetPos);
        this.currentLookAt.copy(this.targetLookAt);
        this.controls.target.copy(this.targetLookAt);
        this.velocityPos.set(0, 0, 0);
        this.velocityLookAt.set(0, 0, 0);

        this.isTransitioning = false;
        this.controls.enabled = true;
        this.controls.update();
      }
    } else {
      this.controls.update();
    }
  }

  /**
   * Cancel ongoing glide and restore controls to current camera state
   */
  public cancelGlide(): void {
    this.isTransitioning = false;
    this.velocityPos.set(0, 0, 0);
    this.velocityLookAt.set(0, 0, 0);
    this.controls.target.copy(this.currentLookAt);
    this.controls.enabled = true;
    this.controls.update();
  }

  public immediatePose(pose: CameraPose): void {
    this.cancelGlide();
    this.camera.position.copy(pose.position);
    this.currentLookAt.copy(pose.target);
    this.controls.target.copy(pose.target);
    this.controls.update();
  }

  public dispose(): void {
    this.controls.removeEventListener('start', this.onUserControlStart);
    this.controls.dispose();
  }
}
