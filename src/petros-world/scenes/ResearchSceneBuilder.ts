/**
 * Petros Research Scene Builder
 * Advanced AI engineering laboratory, supercomputing cluster, and neural synthesis pod.
 */

import * as THREE from 'three';
import { ResourceLoader } from '../core/ResourceLoader';
import { BusinessEvent } from '../events/eventTypes';

export class ResearchSceneBuilder {
  public static async build(
    scene: THREE.Scene,
    loader: ResourceLoader,
    registerReaction: (handler: (e: BusinessEvent) => void) => void
  ): Promise<THREE.Group> {
    const root = new THREE.Group();
    root.name = 'ResearchSceneRoot';

    // 1. Cleanroom Laboratory Architecture
    this.createLaboratoryArchitecture(root);

    let brainModel: THREE.Group | null = null;

    // 2. Load Core GLTF Research & Neural Assets
    try {
      // Central AI Neural Synthesis Brain Core
      brainModel = await loader.instantiateModel('/models/research/neural-brain-stem.glb');
      brainModel.position.set(0, 1.25, -1.0);
      brainModel.scale.set(1.4, 1.4, 1.4);
      root.add(brainModel);

      // Precision Iridescent Optic Sensor Console
      const sensor = await loader.instantiateModel('/models/research/iridescence-optic-sensor.glb');
      sensor.position.set(3.8, 0, 1.2);
      sensor.rotation.y = -Math.PI * 0.4;
      sensor.scale.set(2.2, 2.2, 2.2);
      root.add(sensor);
    } catch (err) {
      console.warn('[ResearchSceneBuilder] Error loading research GLTF models:', err);
    }

    // 3. Central Diagnostic Isolation Pedestal
    const pedestalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.1, 48), pedestalMat);
    pedestal.position.set(0, 0.55, -1.0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    root.add(pedestal);

    // Frosted Glass Cylindrical Isolation Chamber
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      transmission: 0.9,
      ior: 1.45,
    });
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4, 32, 1, true), glassMat);
    chamber.position.set(0, 2.2, -1.0);
    root.add(chamber);

    // 4. Flanking High-Density Server Racks with Blinking Activity LEDs
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.95,
      roughness: 0.2,
    });

    const rack1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.0), rackMat);
    rack1.position.set(-6.5, 2.5, -4.5);
    rack1.castShadow = true;
    root.add(rack1);

    const rack2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.0), rackMat);
    rack2.position.set(-5.0, 2.5, -4.5);
    rack2.castShadow = true;
    root.add(rack2);

    // Server LED activity bank
    const serverLedMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
    });
    const serverLedBank = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 4.2), serverLedMat);
    serverLedBank.position.set(-5.0, 2.5, -3.98);
    root.add(serverLedBank);

    // Event Reaction
    registerReaction((event: BusinessEvent) => {
      if (event.domain === 'research' || event.category === 'research') {
        // High-intensity computational pulse
        serverLedMat.emissive.setHex(0x38bdf8);
        serverLedMat.emissiveIntensity = 3.0;

        if (brainModel) {
          brainModel.rotation.y += Math.PI * 0.5;
        }

        setTimeout(() => {
          serverLedMat.emissive.setHex(0x06b6d4);
          serverLedMat.emissiveIntensity = 0.9;
        }, 1800);
      }
    });

    scene.add(root);
    return root;
  }

  private static createLaboratoryArchitecture(root: THREE.Group): void {
    // Raised cleanroom anti-static floor
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 512);

      const grid = 64;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      for (let x = 0; x < 512; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y < 512; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 6);

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.3,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // Cleanroom white/cyan perimeter wall
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 0.4), wallMat);
    backWall.position.set(0, 6, -8);
    backWall.receiveShadow = true;
    root.add(backWall);
  }
}
