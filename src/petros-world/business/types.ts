/**
 * Petros Business World Types
 */

import * as THREE from 'three';
import { CameraPose } from '../core/CameraController';

export type BusinessDomain = 'campus' | 'agency' | 'commerce' | 'content' | 'research';

export interface RoomManifest {
  id: string;
  label: string;
  description: string;
  cameraPose: CameraPose;
  ambientAudio?: string;
  accentColor: string;
}

export interface BusinessManifest {
  id: BusinessDomain;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  themeColor: string;
  defaultRoom: string;
  rooms: RoomManifest[];
  assetRequirements: {
    name: string;
    url: string;
    localPath: string;
    type: 'glb' | 'texture';
  }[];
}

export interface BusinessWorldState {
  currentDomain: BusinessDomain;
  currentRoom: string;
  visualMode: 'immersive' | 'stage';
  quality: 'ultra' | 'balanced' | 'eco';
  isLoaded: boolean;
  isLoading: boolean;
  activeDomainManifest: BusinessManifest;
}
