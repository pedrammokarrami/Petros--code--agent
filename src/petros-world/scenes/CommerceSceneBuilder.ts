/**
 * Petros Commerce Scene Builder
 * Modern omnichannel logistics hub, automated fulfillment center, and retail showroom.
 */

import * as THREE from 'three';
import { ResourceLoader } from '../core/ResourceLoader';
import { BusinessEvent } from '../events/eventTypes';

export class CommerceSceneBuilder {
  public static async build(
    scene: THREE.Scene,
    loader: ResourceLoader,
    registerReaction: (handler: (e: BusinessEvent) => void) => void
  ): Promise<THREE.Group> {
    const root = new THREE.Group();
    root.name = 'CommerceSceneRoot';

    // 1. Warehouse Floor & Architecture
    this.createWarehouseArchitecture(root);

    let animatedBox: THREE.Group | null = null;

    // 2. Load Core GLTF Logistics & Commerce Assets
    try {
      // Real Delivery Logistics Truck parked at Loading Bay
      const truck = await loader.instantiateModel('/models/commerce/delivery-logistics-truck.glb');
      truck.position.set(-6.5, 0, -1);
      truck.rotation.y = Math.PI * 0.45;
      truck.scale.set(1.2, 1.2, 1.2);
      root.add(truck);

      // Staged Shipping Crates
      const crate1 = await loader.instantiateModel('/models/commerce/shipping-crate.glb');
      crate1.position.set(-1.8, 0, 1.5);
      crate1.scale.set(1.8, 1.8, 1.8);
      root.add(crate1);

      const crate2 = await loader.instantiateModel('/models/commerce/shipping-crate.glb');
      crate2.position.set(-1.8, 1.8, 1.5);
      crate2.rotation.y = Math.PI * 0.25;
      crate2.scale.set(1.8, 1.8, 1.8);
      root.add(crate2);

      // Animated Shipping Box on Staging Conveyor
      animatedBox = await loader.instantiateModel('/models/commerce/shipping-box-animated.glb');
      animatedBox.position.set(1.5, 1.2, 0);
      animatedBox.scale.set(2.4, 2.4, 2.4);
      root.add(animatedBox);

      // Retail Showcase Pedestal with Merchandise
      const bottle = await loader.instantiateModel('/models/commerce/retail-water-bottle.glb');
      bottle.position.set(5.5, 1.2, 1.2);
      bottle.scale.set(9.0, 9.0, 9.0);
      root.add(bottle);
    } catch (err) {
      console.warn('[CommerceSceneBuilder] Error loading commerce GLTF models:', err);
    }

    // 3. Staging Pedestals & Conveyor Rail
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3,
    });
    const conveyor = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 1.8), railMat);
    conveyor.position.set(1.5, 0.8, 0);
    conveyor.receiveShadow = true;
    conveyor.castShadow = true;
    root.add(conveyor);

    // Retail Showroom Pedestal
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.9,
    });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1.0, 32), pedestalMat);
    pedestal.position.set(5.5, 0.5, 1.2);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    root.add(pedestal);

    // 4. Logistics Dispatch Overhead Indicator LED
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), ledMat);
    led.position.set(0, 4.8, -4.5);
    root.add(led);

    // Event Reaction
    registerReaction((event: BusinessEvent) => {
      if (event.domain === 'commerce' || event.category === 'commerce') {
        // Flash indicator amber
        ledMat.emissive.setHex(0xf59e0b);
        ledMat.emissiveIntensity = 2.5;

        // Subtle box animation pulse
        if (animatedBox) {
          const originalY = 1.2;
          animatedBox.position.y = 1.5;
          setTimeout(() => {
            if (animatedBox) animatedBox.position.y = originalY;
          }, 600);
        }

        setTimeout(() => {
          ledMat.emissive.setHex(0x10b981);
          ledMat.emissiveIntensity = 0.8;
        }, 1500);
      }
    });

    scene.add(root);
    return root;
  }

  private static createWarehouseArchitecture(root: THREE.Group): void {
    // Polished industrial concrete floor with hazard tape edge
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 512, 512);

      // Yellow safety line markings
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 14;
      ctx.strokeRect(30, 30, 452, 452);
    }

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.45,
      metalness: 0.15,
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    // Steel Structural Beams on Back Wall
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 0.4), steelMat);
    backWall.position.set(0, 6, -8);
    backWall.receiveShadow = true;
    root.add(backWall);

    // Overhead Yellow Industrial Crane Truss
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.4,
      roughness: 0.5,
    });
    const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(32, 0.6, 0.8), trussMat);
    craneBeam.position.set(0, 9.5, -2);
    root.add(craneBeam);
  }
}
