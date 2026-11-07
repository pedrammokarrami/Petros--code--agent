/**
 * Petros Campus Scene Builder
 * Assembles the realistic executive headquarters, plaza, fountain, and landscape.
 */

import * as THREE from 'three';
import { ResourceLoader } from '../core/ResourceLoader';

export class CampusSceneBuilder {
  public static async build(scene: THREE.Scene, loader: ResourceLoader): Promise<THREE.Group> {
    const root = new THREE.Group();
    root.name = 'CampusSceneRoot';

    // 1. Sky Dome & Ground
    this.createAtmosphere(root);
    this.createPlazaGround(root);

    // 2. Load Core Architectural GLTF Assets
    try {
      // Central Monolith Tower
      const monolith = await loader.instantiateModel('/models/campus/monolith-office-tower.glb');
      monolith.position.set(0, 0, -22);
      monolith.scale.set(1.15, 1.15, 1.15);
      root.add(monolith);

      // Revolving Entrance Bay
      const entrance = await loader.instantiateModel('/models/campus/revolving-entrance-bay.glb');
      entrance.position.set(0, 0, -4);
      entrance.rotation.y = Math.PI;
      root.add(entrance);

      // West Corporate Wing
      const westWing = await loader.instantiateModel('/models/campus/office-tower.glb');
      westWing.position.set(-28, 0, -12);
      westWing.rotation.y = Math.PI * 0.15;
      root.add(westWing);

      // East Innovation Wing
      const eastWing = await loader.instantiateModel('/models/campus/office-tower.glb');
      eastWing.position.set(28, 0, -12);
      eastWing.rotation.y = -Math.PI * 0.15;
      root.add(eastWing);

      // Center Plaza Fountain
      const fountain = await loader.instantiateModel('/models/campus/campus-plaza-fountain.glb');
      fountain.position.set(0, 0, 10);
      root.add(fountain);

      // Landscape: Benches, Trees, Planters, Lamp Posts
      this.populateLandscape(root, loader);
    } catch (err) {
      console.warn('[CampusSceneBuilder] Some campus models failed to load, using graceful fallback:', err);
    }

    scene.add(root);
    return root;
  }

  private static createAtmosphere(root: THREE.Group): void {
    const skyGeo = new THREE.SphereGeometry(220, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x3a6088) },
        bottomColor: { value: new THREE.Color(0xd6e5f3) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    root.add(sky);
  }

  private static createPlazaGround(root: THREE.Group): void {
    // High-quality paved limestone courtyard
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#c5ccd6';
      ctx.fillRect(0, 0, 1024, 1024);

      const tileSize = 64;
      for (let x = 0; x < 1024; x += tileSize) {
        for (let y = 0; y < 1024; y += tileSize) {
          const shade = 185 + Math.floor(Math.sin(x * 12.3 + y * 45.6) * 12);
          ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 8})`;
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

          ctx.fillStyle = '#9aa5b5';
          ctx.fillRect(x, y, tileSize, 2);
          ctx.fillRect(x, y, 2, tileSize);
        }
      }
    }

    const groundTex = new THREE.CanvasTexture(canvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(16, 16);
    groundTex.anisotropy = 8;

    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.78,
      metalness: 0.05,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    root.add(ground);

    // Flanking manicured lawn gardens
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x3d7042,
      roughness: 0.9,
      metalness: 0.02,
    });

    const westLawn = new THREE.Mesh(new THREE.BoxGeometry(32, 0.25, 60), lawnMat);
    westLawn.position.set(-36, 0.12, 10);
    westLawn.receiveShadow = true;
    root.add(westLawn);

    const eastLawn = new THREE.Mesh(new THREE.BoxGeometry(32, 0.25, 60), lawnMat);
    eastLawn.position.set(36, 0.12, 10);
    eastLawn.receiveShadow = true;
    root.add(eastLawn);
  }

  private static async populateLandscape(root: THREE.Group, loader: ResourceLoader): Promise<void> {
    const lampPositions = [
      new THREE.Vector3(-14, 0, 2),
      new THREE.Vector3(14, 0, 2),
      new THREE.Vector3(-14, 0, 20),
      new THREE.Vector3(14, 0, 20),
    ];

    for (const pos of lampPositions) {
      try {
        const lamp = await loader.instantiateModel('/models/campus/campus-lamp-post.glb');
        lamp.position.copy(pos);
        root.add(lamp);
      } catch {}
    }

    const benchPositions = [
      { pos: new THREE.Vector3(-8, 0, 8), rot: Math.PI / 2 },
      { pos: new THREE.Vector3(8, 0, 8), rot: -Math.PI / 2 },
      { pos: new THREE.Vector3(-8, 0, 12), rot: Math.PI / 2 },
      { pos: new THREE.Vector3(8, 0, 12), rot: -Math.PI / 2 },
    ];

    for (const item of benchPositions) {
      try {
        const bench = await loader.instantiateModel('/models/campus/campus-bench.glb');
        bench.position.copy(item.pos);
        bench.rotation.y = item.rot;
        root.add(bench);
      } catch {}
    }

    const treePositions = [
      new THREE.Vector3(-22, 0, 6),
      new THREE.Vector3(-22, 0, 18),
      new THREE.Vector3(22, 0, 6),
      new THREE.Vector3(22, 0, 18),
    ];

    for (const pos of treePositions) {
      try {
        const tree = await loader.instantiateModel('/models/campus/broad-canopy-tree.glb');
        tree.position.copy(pos);
        root.add(tree);
      } catch {}
    }
  }
}
