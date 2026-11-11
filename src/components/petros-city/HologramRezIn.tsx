import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createHologramMaterial, easeBuildProgress, tickHologram } from '../../three/hologramMaterial';

interface Props {
  isFa?: boolean;
  label?: string;
  /** Wall-clock duration of the rez-in sweep. */
  durationMs?: number;
  className?: string;
  color?: string;
}

/**
 * Loading placeholder for a lazily loaded room: a holographic wireframe volume
 * that is "3D printed" from the floor up while the chunk streams in. It uses the
 * shared ShaderMaterial and a tiny throwaway renderer, so it adds no dependency
 * to the main bundle beyond three's core renderer already in use.
 */
export function HologramRezIn({
  isFa = false,
  label,
  durationMs = 1600,
  className = '',
  color = '#4FB8FF',
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const width = host.clientWidth || 320;
    const height = host.clientHeight || 220;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      // No WebGL (or a blocked GPU process) — the CSS rings below still communicate progress.
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearAlpha(0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.15, 3.4);
    camera.lookAt(0, 0.55, 0);

    const material = createHologramMaterial({ color, minY: 0, maxY: 1.6, seamWidth: 0.03 });

    // A room-sized volume: floor plate + bay walls, drawn once with the rez-in shader.
    const group = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 2.2), material);
    floor.position.y = 0.03;
    group.add(floor);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), material);
    shell.position.y = 0.78;
    group.add(shell);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.4), material);
    rack.position.set(-0.6, 0.48, -0.5);
    group.add(rack);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), material);
    desk.position.set(0.55, 0.2, -0.35);
    group.add(desk);
    scene.add(group);

    const start = performance.now();
    let frame = 0;
    let disposed = false;

    const render = (now: number) => {
      if (disposed) return;
      const elapsed = (now - start) / 1000;
      material.uniforms.uBuild.value = easeBuildProgress(((now - start) / durationMs) * 1.05);
      tickHologram(material, elapsed);
      group.rotation.y = Math.sin(elapsed * 0.35) * 0.18;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onResize = () => {
      const w = host.clientWidth || width;
      const h = host.clientHeight || height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [color, durationMs]);

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div
        ref={hostRef}
        aria-hidden="true"
        className="relative w-full max-w-md h-52 rounded-2xl border border-[#4FB8FF]/25 bg-[#040B16]/60 overflow-hidden"
        style={{ boxShadow: 'inset 0 0 40px rgba(79,184,255,0.12)' }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#4FB8FF]/10 to-transparent" />
      </div>
      <div className="flex items-center gap-2 text-xs font-mono text-[#4FB8FF]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4FB8FF] animate-pulse" />
        <span>{label ?? (isFa ? 'در حال ساخت اتاق…' : 'REZZING ROOM GEOMETRY…')}</span>
      </div>
    </div>
  );
}

export default HologramRezIn;
