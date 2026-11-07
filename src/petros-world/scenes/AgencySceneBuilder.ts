/**
 * Petros Agency Scene Builder
 * Modern corporate consulting, executive boardroom, and project coordination suite.
 */

import * as THREE from 'three';
import { ResourceLoader } from '../core/ResourceLoader';
import { BusinessEvent } from '../events/eventTypes';

export class AgencySceneBuilder {
  public static async build(
    scene: THREE.Scene,
    loader: ResourceLoader,
    registerReaction: (handler: (e: BusinessEvent) => void) => void
  ): Promise<THREE.Group> {
    const root = new THREE.Group();
    root.name = 'AgencySceneRoot';

    // 1. Executive Suite Architecture (Walls, Polished Hardwood Floor, Glass Partitions)
    this.createExecutiveArchitecture(root);

    // 2. Load Core GLTF Furniture & Decor Assets
    try {
      // Modern Sheen Designer Armchairs in Client Lounge
      const chair1 = await loader.instantiateModel('/models/agency/sheen-chair.glb');
      chair1.position.set(2.2, 0, 0.8);
      chair1.rotation.y = -Math.PI * 0.7;
      chair1.scale.set(1.4, 1.4, 1.4);
      root.add(chair1);

      const chair2 = await loader.instantiateModel('/models/agency/sheen-chair.glb');
      chair2.position.set(-2.2, 0, 0.8);
      chair2.rotation.y = Math.PI * 0.7;
      chair2.scale.set(1.4, 1.4, 1.4);
      root.add(chair2);

      // Executive Boardroom Armchair at Strategy Desk
      const execChair = await loader.instantiateModel('/models/agency/executive-chair.glb');
      execChair.position.set(0, 0, -2.8);
      execChair.rotation.y = 0;
      execChair.scale.set(1.2, 1.2, 1.2);
      root.add(execChair);

      // Glass Vase with Fresh Flowers on Conference Credenza
      const vase = await loader.instantiateModel('/models/agency/glass-vase-flowers.glb');
      vase.position.set(0, 1.05, 0.5);
      vase.scale.set(1.8, 1.8, 1.8);
      root.add(vase);
    } catch (err) {
      console.warn('[AgencySceneBuilder] Error loading agency GLTF models:', err);
    }

    // 3. Central Strategy Table (American Walnut & Frosted Glass)
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x2b221d,
      roughness: 0.35,
      metalness: 0.1,
    });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.12, 48), tableMat);
    tableTop.position.set(0, 1.0, 0.5);
    tableTop.receiveShadow = true;
    tableTop.castShadow = true;
    root.add(tableTop);

    const tableBaseMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      metalness: 0.85,
      roughness: 0.2,
    });
    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 1.0, 32), tableBaseMat);
    tableBase.position.set(0, 0.5, 0.5);
    tableBase.castShadow = true;
    root.add(tableBase);

    // 4. Strategic Presentation Board on Back Wall
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x181822,
      roughness: 0.2,
      metalness: 0.8,
    });
    const displayFrame = new THREE.Mesh(new THREE.BoxGeometry(8, 3.8, 0.15), boardMat);
    displayFrame.position.set(0, 3.6, -7.8);
    root.add(displayFrame);

    // Screen with dynamic emissive glow
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.45,
      roughness: 0.1,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.4), screenMat);
    screen.position.set(0, 3.6, -7.7);
    root.add(screen);

    // Register event reaction: when agency event fires, pulse the presentation screen
    registerReaction((event: BusinessEvent) => {
      if (event.domain === 'agency' || event.category === 'agency') {
        screenMat.emissive.setHex(0x8b5cf6);
        screenMat.emissiveIntensity = 1.2;
        setTimeout(() => {
          screenMat.emissive.setHex(0x3b82f6);
          screenMat.emissiveIntensity = 0.45;
        }, 1200);
      }
    });

    scene.add(root);
    return root;
  }

  private static createExecutiveArchitecture(root: THREE.Group): void {
    // Polished Herringbone / Hardwood Floor
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#453229';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#2d1e18';
      ctx.lineWidth = 3;
      const plankHeight = 32;
      for (let y = 0; y < 512; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    }

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(12, 12);

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // Back architectural wall
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x22242e,
      roughness: 0.85,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 0.4), wallMat);
    backWall.position.set(0, 6, -8);
    backWall.receiveShadow = true;
    root.add(backWall);

    // Flanking tinted architectural glass walls
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.5,
    });
    const westGlass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 12, 24), glassMat);
    westGlass.position.set(-14, 6, 2);
    root.add(westGlass);

    const eastGlass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 12, 24), glassMat);
    eastGlass.position.set(14, 6, 2);
    root.add(eastGlass);
  }
}
