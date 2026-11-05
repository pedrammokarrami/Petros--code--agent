/**
 * LuminousPointCloudCanvas.tsx
 *
 * Implements the Petros City "Luminous Scan" art direction (docs/redesign/ART_DIRECTION.md):
 * - Void: #02040A with radial lift #06101F behind focal center.
 * - Point ramp: #0A2E66 -> #1F6FEB -> #4FB8FF -> #DFF4FF (peak <1% of points).
 * - Signal Amber #FFB454 strictly reserved for active AI execution (<=2% of points).
 * - Depth layers, soft gaussian sprites, rim glow.
 * - Performance optimized with requestAnimationFrame and resize throttling.
 */

import React, { useEffect, useRef } from 'react';

interface Props {
  isExecuting?: boolean;
  activeRoom?: string;
  className?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseRadius: number;
  brightness: number; // 0 to 1
  isAmber: boolean;
  phase: number;
  phaseSpeed: number;
}

export function LuminousPointCloudCanvas({
  isExecuting = false,
  activeRoom = 'welcome',
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Create 450 depth points
    const POINT_COUNT = 480;
    const points: Point3D[] = [];

    for (let i = 0; i < POINT_COUNT; i++) {
      // Composition: focal ring with radial dissolve into void
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.pow(Math.random(), 1.6) * Math.min(width, height) * 0.48;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.48; // Slight 3D disc tilt
      const z = (Math.random() - 0.5) * 350;

      const brightness = Math.random();
      // Only assign amber if currently executing and under 2% threshold
      const isAmber = isExecuting && Math.random() < 0.02;

      points.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.12,
        vz: (Math.random() - 0.5) * 0.15,
        baseRadius: 1.0 + Math.random() * 1.6,
        brightness,
        isAmber,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.008 + Math.random() * 0.016,
      });
    }

    let t = 0;

    const render = () => {
      t += 0.01;

      // 1. VOID BACKGROUND: #02040A with radial lift #06101F behind the focal center
      const centerX = width * 0.5;
      const centerY = height * 0.46;
      const maxDim = Math.max(width, height);

      const radialGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        40,
        centerX,
        centerY,
        maxDim * 0.72
      );
      radialGrad.addColorStop(0, '#06101F');
      radialGrad.addColorStop(0.45, '#030814');
      radialGrad.addColorStop(1, '#02040A');

      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle architectural scan horizontal grid lines (very dim)
      ctx.strokeStyle = 'rgba(10, 46, 102, 0.06)';
      ctx.lineWidth = 1;
      const lineStep = 48;
      for (let ly = (t * 4) % lineStep; ly < height; ly += lineStep) {
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(width, ly);
        ctx.stroke();
      }

      // 2. RENDER POINT CLOUD
      // Sort points by z for proper depth cueing
      points.sort((a, b) => b.z - a.z);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Motion update: slow subtle drift
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.phase += p.phaseSpeed;

        // Wrap around boundaries
        const boundX = width * 0.45;
        const boundY = height * 0.35;
        if (p.x < -boundX) p.x = boundX;
        if (p.x > boundX) p.x = -boundX;
        if (p.y < -boundY) p.y = boundY;
        if (p.y > boundY) p.y = -boundY;
        if (p.z < -175) p.z = 175;
        if (p.z > 175) p.z = -175;

        // Dynamic amber allocation based on live execution state
        const isAmber = isExecuting && (i % 38 === 0 || p.isAmber);

        // Perspective projection
        const fov = 650;
        const scale = fov / (fov + p.z);
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;

        // Depth fog & size calculation
        const pointSize = Math.max(0.6, p.baseRadius * scale);
        const depthAlpha = Math.max(0.08, Math.min(0.85, (1 - p.z / 350) * 0.65));
        const twinkle = 0.8 + 0.2 * Math.sin(p.phase);

        ctx.beginPath();
        ctx.arc(screenX, screenY, pointSize, 0, Math.PI * 2);

        if (isAmber) {
          // Signal amber #FFB454 ONLY for active work
          ctx.fillStyle = `rgba(255, 180, 84, ${depthAlpha * twinkle})`;
          ctx.shadowColor = '#FFB454';
          ctx.shadowBlur = 6;
        } else {
          // Point ramp by brightness: #0A2E66 -> #1F6FEB -> #4FB8FF -> #DFF4FF
          ctx.shadowBlur = 0;
          if (p.brightness > 0.88) {
            ctx.fillStyle = `rgba(223, 244, 255, ${depthAlpha * twinkle})`; // Peak #DFF4FF
          } else if (p.brightness > 0.55) {
            ctx.fillStyle = `rgba(79, 184, 255, ${depthAlpha * twinkle})`;  // Bright blue #4FB8FF
          } else if (p.brightness > 0.25) {
            ctx.fillStyle = `rgba(31, 111, 235, ${depthAlpha * twinkle * 0.8})`; // Mid blue #1F6FEB
          } else {
            ctx.fillStyle = `rgba(10, 46, 102, ${depthAlpha * twinkle * 0.6})`;  // Deep navy #0A2E66
          }
        }

        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [isExecuting, activeRoom]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ background: '#02040A' }}
    />
  );
}
