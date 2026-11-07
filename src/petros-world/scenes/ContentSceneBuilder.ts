/**
 * Petros Content Scene Builder
 * Media broadcast stage, production lighting truss, studio camera, and audio master console.
 */

import * as THREE from 'three';
import { ResourceLoader } from '../core/ResourceLoader';
import { BusinessEvent } from '../events/eventTypes';

export class ContentSceneBuilder {
  public static async build(
    scene: THREE.Scene,
    loader: ResourceLoader,
    registerReaction: (handler: (e: BusinessEvent) => void) => void
  ): Promise<THREE.Group> {
    const root = new THREE.Group();
    root.name = 'ContentSceneRoot';

    // 1. Studio Architecture (Acoustic Panels & Dark Stage)
    this.createStudioArchitecture(root);

    // 2. Load Core GLTF Content Production Assets
    try {
      // Professional Studio Camera Rig
      const cameraRig = await loader.instantiateModel('/models/content/studio-camera.glb');
      cameraRig.position.set(2.4, 0, 3.2);
      cameraRig.rotation.y = -Math.PI * 0.75;
      cameraRig.scale.set(0.18, 0.18, 0.18);
      root.add(cameraRig);

      // Master Audio Engineering Boombox / Sound Console
      const audioConsole = await loader.instantiateModel('/models/content/broadcast-audio-boombox.glb');
      audioConsole.position.set(-2.8, 1.0, 0.5);
      audioConsole.rotation.y = Math.PI * 0.35;
      audioConsole.scale.set(45.0, 45.0, 45.0);
      root.add(audioConsole);
    } catch (err) {
      console.warn('[ContentSceneBuilder] Error loading content GLTF models:', err);
    }

    // 3. Audio Console Staging Table
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const audioTable = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 1.4), tableMat);
    audioTable.position.set(-2.8, 0.45, 0.5);
    audioTable.receiveShadow = true;
    audioTable.castShadow = true;
    root.add(audioTable);

    // 4. Central Presenter Stage Podium
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.3,
      metalness: 0.5,
    });
    const stageRiser = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.35, 48), stageMat);
    stageRiser.position.set(0, 0.175, -1.5);
    stageRiser.receiveShadow = true;
    stageRiser.castShadow = true;
    root.add(stageRiser);

    // 5. Overhead "ON AIR" Indicator Sign
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.2,
      metalness: 0.8,
    });
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.3), signMat);
    signBox.position.set(0, 5.2, -7.6);
    root.add(signBox);

    const onAirMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0xdc2626,
      emissiveIntensity: 0.35,
    });
    const onAirFace = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.7), onAirMat);
    onAirFace.position.set(0, 5.2, -7.4);
    root.add(onAirFace);

    // Event Reaction
    registerReaction((event: BusinessEvent) => {
      if (event.domain === 'content' || event.category === 'content') {
        // Flash "ON AIR" bright red
        onAirMat.emissive.setHex(0xef4444);
        onAirMat.emissiveIntensity = 2.8;

        setTimeout(() => {
          onAirMat.emissive.setHex(0xdc2626);
          onAirMat.emissiveIntensity = 0.35;
        }, 2000);
      }
    });

    scene.add(root);
    return root;
  }

  private static createStudioArchitecture(root: THREE.Group): void {
    // Matte dark acoustic floor
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x121216,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // Acoustic Studio Back Wall
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x18181f,
      roughness: 0.95,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 0.4), wallMat);
    backWall.position.set(0, 6, -8);
    backWall.receiveShadow = true;
    root.add(backWall);

    // Overhead Aluminum Lighting Truss
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const truss1 = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 0.3), trussMat);
    truss1.position.set(0, 8.5, 0);
    root.add(truss1);

    const truss2 = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 0.3), trussMat);
    truss2.position.set(0, 8.5, -4);
    root.add(truss2);
  }
}
