/**
 * Petros Business World Manager (Zustand Store)
 * Manages domain manifests, room selection, visual mode, and quality tier.
 */

import { create } from 'zustand';
import { BusinessDomain, BusinessManifest, BusinessWorldState } from './types';
import { CampusManifest } from './manifests/CampusManifest';
import { AgencyManifest } from './manifests/AgencyManifest';
import { CommerceManifest } from './manifests/CommerceManifest';
import { ContentManifest } from './manifests/ContentManifest';
import { ResearchManifest } from './manifests/ResearchManifest';
import { QualityTier } from '../core/QualityProfile';

export const DOMAIN_MANIFESTS: Record<BusinessDomain, BusinessManifest> = {
  campus: CampusManifest,
  agency: AgencyManifest,
  commerce: CommerceManifest,
  content: ContentManifest,
  research: ResearchManifest,
};

interface BusinessWorldStore extends BusinessWorldState {
  setDomain: (domain: BusinessDomain) => void;
  setRoom: (roomId: string) => void;
  setVisualMode: (mode: 'immersive' | 'stage') => void;
  setQuality: (tier: QualityTier) => void;
  setIsLoading: (loading: boolean) => void;
  setIsLoaded: (loaded: boolean) => void;
  getActiveRoom: () => any;
}

const getInitialDomain = (): BusinessDomain => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('petros_active_domain') as BusinessDomain;
    if (saved && DOMAIN_MANIFESTS[saved]) return saved;
  }
  return 'campus';
};

const getInitialMode = (): 'immersive' | 'stage' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('petros_visual_mode');
    if (saved === 'stage' || saved === 'immersive') return saved;
  }
  return 'immersive';
};

const initialDomain = getInitialDomain();
const initialManifest = DOMAIN_MANIFESTS[initialDomain];

export const useBusinessWorldStore = create<BusinessWorldStore>((set, get) => ({
  currentDomain: initialDomain,
  currentRoom: initialManifest.defaultRoom,
  visualMode: getInitialMode(),
  quality: 'balanced',
  isLoaded: false,
  isLoading: false,
  activeDomainManifest: initialManifest,

  setDomain: (domain: BusinessDomain) => {
    const manifest = DOMAIN_MANIFESTS[domain];
    if (!manifest) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('petros_active_domain', domain);
    }
    set({
      currentDomain: domain,
      activeDomainManifest: manifest,
      currentRoom: manifest.defaultRoom,
    });
  },

  setRoom: (roomId: string) => {
    const { activeDomainManifest } = get();
    const roomExists = activeDomainManifest.rooms.some((r) => r.id === roomId);
    if (!roomExists) return;
    set({ currentRoom: roomId });
  },

  setVisualMode: (mode: 'immersive' | 'stage') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('petros_visual_mode', mode);
    }
    set({ visualMode: mode });
  },

  setQuality: (tier: QualityTier) => {
    set({ quality: tier });
  },

  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setIsLoaded: (loaded: boolean) => {
    set({ isLoaded: loaded });
  },

  getActiveRoom: () => {
    const { activeDomainManifest, currentRoom } = get();
    return (
      activeDomainManifest.rooms.find((r) => r.id === currentRoom) ||
      activeDomainManifest.rooms[0]
    );
  },
}));
