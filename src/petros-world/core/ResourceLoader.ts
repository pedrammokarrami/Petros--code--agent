/**
 * Petros Resource Loader & Progressive Asset Cache
 * Loads GLTF/GLB models using local Draco decoding.
 * Provides caching, memory tracking, and proper WebGL resource disposal.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface ModelCacheItem {
  url: string;
  gltf: any;
  clonedScene: THREE.Group;
  lastAccessed: number;
}

export class ResourceLoader {
  private static instance: ResourceLoader | null = null;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private cache: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.dracoLoader.preload();

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  public static getInstance(): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader();
    }
    return ResourceLoader.instance;
  }

  /**
   * Loads a GLTF/GLB model from URL or local path, caching the parsed GLTF.
   */
  public async loadGLTF(url: string): Promise<any> {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf);
          this.loadingPromises.delete(url);
          resolve(gltf);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(url);
          console.error(`[ResourceLoader] Error loading ${url}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * Returns a cloned scene instance of the model ready to add to a Three.js scene.
   */
  public async instantiateModel(url: string): Promise<THREE.Group> {
    const gltf = await this.loadGLTF(url);
    const clone = gltf.scene.clone(true);
    
    // Ensure all materials are properly set up for shadow rendering
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });

    return clone;
  }

  /**
   * Safely disposes a Three.js Object3D hierarchy (geometries, materials, textures).
   */
  public static disposeHierarchy(obj: THREE.Object3D): void {
    obj.traverse((child: any) => {
      if (child.isMesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: THREE.Material) => ResourceLoader.disposeMaterial(mat));
          } else {
            ResourceLoader.disposeMaterial(child.material);
          }
        }
      }
    });
  }

  private static disposeMaterial(mat: THREE.Material): void {
    mat.dispose();
    for (const key of Object.keys(mat)) {
      const val = (mat as any)[key];
      if (val && val.isTexture) {
        val.dispose();
      }
    }
  }

  public clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}
