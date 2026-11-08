/**
 * Petros World Viewport
 * Highly optimized React wrapper hosting the Three.js SceneEngine canvas.
 * Decoupled from React render cycles: listens to Zustand business world state via direct store subscription
 * so that room transitions and viewpoint changes execute with 0 React reconciliations and 0 DOM reflows.
 */

import React, { useEffect, useRef, memo } from 'react';
import { SceneEngine } from '../core/SceneEngine';
import { useBusinessWorldStore } from '../business/BusinessWorldManager';

interface Props {
  activeMode: 'normal' | 'holographic' | 'immersive' | 'stage';
  onLoaded?: () => void;
}

export const PetrosWorldViewport: React.FC<Props> = memo(({ activeMode, onLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  const isVisible = activeMode === 'holographic' || activeMode === 'immersive';

  useEffect(() => {
    if (!containerRef.current) return;

    const store = useBusinessWorldStore.getState();
    const engine = new SceneEngine(containerRef.current, store.quality);
    engineRef.current = engine;

    store.setIsLoading(true);
    engine
      .switchDomain(store.currentDomain, store.currentRoom)
      .then(() => {
        store.setIsLoading(false);
        store.setIsLoaded(true);
        if (onLoaded) onLoaded();
      })
      .catch((err) => {
        console.error('[PetrosWorldViewport] Failed to init domain:', err);
        store.setIsLoading(false);
      });

    // Track previous values to prevent redundant invocations
    let prevDomain = store.currentDomain;
    let prevRoom = store.currentRoom;
    let prevQuality = store.quality;

    // Subscribe to store updates directly: NO React re-renders, 0 frame drops
    const unsub = useBusinessWorldStore.subscribe((state) => {
      if (!engineRef.current) return;

      // 1. Domain switch (loads new scene assets)
      if (state.currentDomain !== prevDomain) {
        prevDomain = state.currentDomain;
        prevRoom = state.currentRoom;
        store.setIsLoading(true);
        engineRef.current
          .switchDomain(state.currentDomain, state.currentRoom)
          .then(() => store.setIsLoading(false))
          .catch(() => store.setIsLoading(false));
      }
      // 2. Room switch within current domain (Instant, silky-smooth glide)
      else if (state.currentRoom !== prevRoom) {
        prevRoom = state.currentRoom;
        engineRef.current.switchRoom(state.currentRoom);
      }

      // 3. Quality tier change
      if (state.quality !== prevQuality) {
        prevQuality = state.quality;
        engineRef.current.setQuality(state.quality);
      }
    });

    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
  }, [onLoaded]);

  return (
    <div
      ref={containerRef}
      id="petros-world-canvas-container"
      className={`absolute inset-0 w-full h-full pointer-events-auto transition-opacity duration-700 ${
        isVisible ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
      }`}
    />
  );
});
