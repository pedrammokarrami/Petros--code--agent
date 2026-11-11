/**
 * Holographic "rez-in" material.
 *
 * Used while a room chunk (or a compressed GLB) is still streaming: the geometry
 * is 3D-printed from the floor up by discarding every fragment above a moving
 * threshold, while a Fresnel rim + scrolling scanline makes the wait feel
 * intentional instead of broken.
 *
 * The maths mirror the reference implementation:
 *  - the view vector must be negated (`-mvPosition.xyz`) so it points from the
 *    surface toward the camera; without the flip the Fresnel dot product inverts
 *    and faces aimed at the camera glow instead of the silhouette.
 *  - `discard` compares the model-space height against `buildProgress`, so the
 *    effect costs no extra geometry and works on any mesh.
 */

import * as THREE from 'three';

export interface HologramUniforms {
  [uniform: string]: THREE.IUniform;
  /** Seconds since the effect started. */
  uTime: { value: number };
  /** 0 = nothing printed, 1 = fully materialised. */
  uBuild: { value: number };
  /** Room tint. */
  uColor: { value: THREE.Color };
  /** Vertical extent of the mesh in model space. */
  uMinY: { value: number };
  uMaxY: { value: number };
  /** Strength of the rim light (0 disables it). */
  uRim: { value: number };
  /** Height of the build seam glow. */
  uSeamWidth: { value: number };
}

export interface HologramMaterialOptions {
  color?: THREE.ColorRepresentation;
  minY?: number;
  maxY?: number;
  rim?: number;
  seamWidth?: number;
  wireframe?: boolean;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vModelPosition;

  void main() {
    vModelPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Negated on purpose: the view vector must point from the surface to the eye.
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBuild;
  uniform vec3  uColor;
  uniform float uMinY;
  uniform float uMaxY;
  uniform float uRim;
  uniform float uSeamWidth;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vModelPosition;

  void main() {
    // 1. Rez-in cutoff: abort every pixel above the build threshold.
    float span = max(uMaxY - uMinY, 0.0001);
    float cutoff = uMinY + span * clamp(uBuild, 0.0, 1.0);
    if (vModelPosition.y > cutoff) discard;

    // 2. Fresnel rim: silhouettes glow, front faces stay translucent.
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 2.5);

    // 3. Horizontal scanline travelling up the model.
    float band = fract(vModelPosition.y * 18.0 - uTime * 1.6);
    float scan = smoothstep(0.0, 0.22, band) * smoothstep(0.55, 0.22, band);

    // 4. Bright seam exactly at the build frontier.
    float seam = 1.0 - smoothstep(0.0, uSeamWidth, abs(vModelPosition.y - cutoff));

    vec3 color = uColor * (0.35 + 0.85 * fresnel) + uColor * scan * 0.5;
    color += vec3(1.0) * seam * 0.9;

    float alpha = 0.16 + 0.62 * fresnel + 0.28 * scan + seam * 0.7;
    if (uBuild >= 0.999) alpha = clamp(alpha, 0.0, 0.8);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uRim);
    #include <colorspace_fragment>
  }
`;

export function createHologramMaterial(options: HologramMaterialOptions = {}) {
  const uniforms: HologramUniforms = {
    uTime: { value: 0 },
    uBuild: { value: 0 },
    uColor: { value: new THREE.Color(options.color ?? '#4FB8FF') },
    uMinY: { value: options.minY ?? 0 },
    uMaxY: { value: options.maxY ?? 1 },
    uRim: { value: options.rim ?? 1 },
    uSeamWidth: { value: options.seamWidth ?? 0.02 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    wireframe: options.wireframe ?? false,
    blending: THREE.AdditiveBlending,
  });

  material.userData.hologramUniforms = uniforms;
  return material;
}

/** Advance the clock; returns the material so it can be chained. */
export function tickHologram(material: THREE.ShaderMaterial, elapsedSeconds: number): void {
  const uniforms = material.userData.hologramUniforms as HologramUniforms | undefined;
  if (!uniforms) return;
  uniforms.uTime.value = elapsedSeconds;
}

/**
 * Fit the vertical build range to a real object so a room GLB rez-in uses its own
 * bounding box instead of a guessed height.
 */
export function fitBuildRange(material: THREE.ShaderMaterial, object: THREE.Object3D): void {
  const uniforms = material.userData.hologramUniforms as HologramUniforms | undefined;
  if (!uniforms) return;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  uniforms.uMinY.value = box.min.y;
  uniforms.uMaxY.value = box.max.y;
}

/** Easing used by every room transition so the rez-in feels physical. */
export function easeBuildProgress(raw: number): number {
  const t = Math.min(1, Math.max(0, raw));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
