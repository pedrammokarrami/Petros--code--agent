/**
 * Petros World Viewport
 * React wrapper hosting the Three.js SceneEngine canvas and synchronizing with Zustand store.
 */

import React, { useEffect, useRef } from 'react';
import { SceneEngine } from '../core/SceneEngine';
import { useBusinessWorldStore } from '../business/BusinessWorldManager';

interface Props {
  activeMode: 'normal' | 'holographic' | 'immersive' | 'stage';
  onLoaded?: () => void;
}

export const PetrosWorldViewport: React.FC<Props> = ({ activeMode, onLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  const currentDomain = useBusinessWorldStore((s) => s.currentDomain);
  const currentRoom = useBusinessWorldStore((s) => s.currentRoom);
  const quality = useBusinessWorldStore((s) => s.quality);
  const setIsLoading = useBusinessWorldStore((s) => s.setIsLoading);
  const setIsLoaded = useBusinessWorldStore((s) => s.setIsLoaded);

  const isVisible = activeMode === 'holographic' || activeMode === 'immersive';

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new SceneEngine(containerRef.current, quality);
    engineRef.current = engine;

    setIsLoading(true);
    engine
      .switchDomain(currentDomain, currentRoom)
      .then(() => {
        setIsLoading(false);
        setIsLoaded(true);
        if (onLoaded) onLoaded();
      })
      .catch((err) => {
        console.error('[PetrosWorldViewport] Failed to init domain:', err);
        setIsLoading(false);
      });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Synchronize domain changes
  useEffect(() => {
    if (engineRef.current && isVisible) {
      setIsLoading(true);
      engineRef.current
        .switchDomain(currentDomain, currentRoom)
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
    }
  }, [currentDomain]);

  // Synchronize room changes
  useEffect(() => {
    if (engineRef.current && isVisible && currentRoom) {
      engineRef.current.switchRoom(currentRoom);
    }
  }, [currentRoom]);

  // Synchronize quality changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setQuality(quality);
    }
  }, [quality]);

  return (
    <div
      ref={containerRef}
      id="petros-world-canvas-container"
      className={`absolute inset-0 w-full h-full pointer-events-auto transition-opacity duration-700 ${
        isVisible ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
      }`}
    />
  );
};
