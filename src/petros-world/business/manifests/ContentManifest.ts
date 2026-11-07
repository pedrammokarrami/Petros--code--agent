import * as THREE from 'three';
import { BusinessManifest } from '../types';

export const ContentManifest: BusinessManifest = {
  id: 'content',
  title: 'Petros Media Broadcast & Studio',
  subtitle: 'Creative Production, Audio-Visual Rigs & Streaming Stage',
  badge: 'Content Studio',
  description: 'Full-scale media production facility equipped with broadcast camera rigs, studio lighting, audio engineering, and live rendering pipeline.',
  themeColor: '#ec4899',
  defaultRoom: 'broadcast_stage',
  rooms: [
    {
      id: 'broadcast_stage',
      label: 'Main Broadcast Stage',
      description: 'Acoustically isolated production stage with professional camera rigs, key lighting, and presenter podium.',
      accentColor: '#ec4899',
      cameraPose: {
        position: new THREE.Vector3(7, 5, 8),
        target: new THREE.Vector3(0, 1.4, 0),
        duration: 1.3,
      },
    },
    {
      id: 'audio_booth',
      label: 'Audio Engineering Booth',
      description: 'Precision sound mastering suite with monitor speakers, reference acoustic baffles, and mixer console.',
      accentColor: '#f43f5e',
      cameraPose: {
        position: new THREE.Vector3(0, 4.5, 6),
        target: new THREE.Vector3(0, 1.2, -1),
        duration: 1.2,
      },
    },
    {
      id: 'editing_bay',
      label: 'Post-Production Suite',
      description: 'High-speed media workstations handling multi-track 4K video rendering and content distribution.',
      accentColor: '#d946ef',
      cameraPose: {
        position: new THREE.Vector3(-6, 6, 7),
        target: new THREE.Vector3(1, 1.2, -1),
        duration: 1.3,
      },
    },
  ],
  assetRequirements: [
    {
      name: 'studio-camera',
      url: '/models/content/studio-camera.glb',
      localPath: 'public/models/content/studio-camera.glb',
      type: 'glb',
    },
    {
      name: 'broadcast-audio-boombox',
      url: '/models/content/broadcast-audio-boombox.glb',
      localPath: 'public/models/content/broadcast-audio-boombox.glb',
      type: 'glb',
    },
  ],
};
