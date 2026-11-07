/**
 * Petros Lighting Manager
 * Sets up realistic PBR lighting, soft shadows, sky bounce, and domain-specific accents.
 */

import * as THREE from 'three';

export interface LightingConfig {
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  fogColor?: number;
  fogNear?: number;
  fogFar?: number;
}

export class LightingManager {
  private group: THREE.Group;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private accentLights: THREE.PointLight[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LightingGroup';

    this.ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.45);
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);

    this.setupSunLight();

    this.group.add(this.ambientLight);
    this.group.add(this.hemiLight);
    this.group.add(this.sunLight);
  }

  private setupSunLight(): void {
    this.sunLight.position.set(45, 75, 40);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 280;

    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.radius = 2.5;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public configureExteriorDaylight(): void {
    this.ambientLight.color.setHex(0xddeeff);
    this.ambientLight.intensity = 0.65;
    this.hemiLight.color.setHex(0xffffff);
    this.hemiLight.groundColor.setHex(0x444455);
    this.hemiLight.intensity = 0.5;

    this.sunLight.color.setHex(0xfffaed);
    this.sunLight.intensity = 2.2;
    this.sunLight.position.set(45, 75, 40);
    this.clearAccents();
  }

  public configureInteriorStudio(mood: 'agency' | 'commerce' | 'content' | 'research'): void {
    this.clearAccents();

    if (mood === 'agency') {
      // Warm corporate elegance
      this.ambientLight.color.setHex(0xeef2ff);
      this.ambientLight.intensity = 0.8;
      this.hemiLight.intensity = 0.4;
      this.sunLight.intensity = 1.4;
      this.sunLight.position.set(20, 40, 20);

      this.addAccentLight(new THREE.Vector3(0, 8, 0), 0xfff0dd, 2.0, 25);
    } else if (mood === 'commerce') {
      // Crisp commercial fulfillment lighting
      this.ambientLight.color.setHex(0xf8fafc);
      this.ambientLight.intensity = 0.9;
      this.hemiLight.intensity = 0.5;
      this.sunLight.intensity = 1.6;
      this.sunLight.position.set(30, 45, 15);

      this.addAccentLight(new THREE.Vector3(0, 10, -5), 0x00e5ff, 1.5, 30);
      this.addAccentLight(new THREE.Vector3(10, 8, 5), 0xffb703, 1.2, 25);
    } else if (mood === 'content') {
      // Media stage key & fill broadcast lighting
      this.ambientLight.color.setHex(0x1e1b4b);
      this.ambientLight.intensity = 0.4;
      this.hemiLight.intensity = 0.3;
      this.sunLight.intensity = 0.8;
      this.sunLight.position.set(-15, 30, 25);

      this.addAccentLight(new THREE.Vector3(-6, 7, 4), 0x6366f1, 2.5, 20); // Key light
      this.addAccentLight(new THREE.Vector3(6, 6, -3), 0xec4899, 2.2, 20); // Rim light
    } else if (mood === 'research') {
      // Precision tech / clean room cyan-tinted luminescent
      this.ambientLight.color.setHex(0xf0fdfa);
      this.ambientLight.intensity = 0.85;
      this.hemiLight.intensity = 0.45;
      this.sunLight.intensity = 1.5;
      this.sunLight.position.set(15, 50, 20);

      this.addAccentLight(new THREE.Vector3(0, 9, 0), 0x06b6d4, 2.0, 25);
      this.addAccentLight(new THREE.Vector3(0, 2, 0), 0x3b82f6, 1.2, 15);
    }
  }

  private addAccentLight(pos: THREE.Vector3, color: number, intensity: number, distance: number): void {
    const light = new THREE.PointLight(color, intensity, distance, 1.8);
    light.position.copy(pos);
    this.accentLights.push(light);
    this.group.add(light);
  }

  private clearAccents(): void {
    for (const light of this.accentLights) {
      this.group.remove(light);
      light.dispose();
    }
    this.accentLights = [];
  }
}
