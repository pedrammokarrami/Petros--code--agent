/**
 * Petros Quality Profile Manager
 * Dynamically tunes rendering fidelity, draw distance, shadow maps, and pixel ratio.
 */

export type QualityTier = 'ultra' | 'balanced' | 'eco';

export interface QualitySettings {
  tier: QualityTier;
  pixelRatio: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  antialias: boolean;
  maxAnisotropy: number;
  drawDistance: number;
  modelLodBias: number;
}

export const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  ultra: {
    tier: 'ultra',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2, 2),
    shadowMapSize: 2048,
    shadowsEnabled: true,
    antialias: true,
    maxAnisotropy: 16,
    drawDistance: 350,
    modelLodBias: 0,
  },
  balanced: {
    tier: 'balanced',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1.5, 1.5),
    shadowMapSize: 1024,
    shadowsEnabled: true,
    antialias: true,
    maxAnisotropy: 8,
    drawDistance: 250,
    modelLodBias: 1,
  },
  eco: {
    tier: 'eco',
    pixelRatio: 1,
    shadowMapSize: 512,
    shadowsEnabled: false,
    antialias: false,
    maxAnisotropy: 2,
    drawDistance: 150,
    modelLodBias: 2,
  },
};

export class QualityManager {
  private currentSettings: QualitySettings;

  constructor(initialTier: QualityTier = 'balanced') {
    this.currentSettings = { ...QUALITY_PRESETS[initialTier] };
  }

  public getSettings(): QualitySettings {
    return this.currentSettings;
  }

  public setTier(tier: QualityTier): QualitySettings {
    this.currentSettings = { ...QUALITY_PRESETS[tier] };
    return this.currentSettings;
  }
}
