import * as THREE from 'three';
import { BusinessManifest } from '../types';

export const CampusManifest: BusinessManifest = {
  id: 'campus',
  title: 'Petros Central Headquarters',
  subtitle: 'Executive Courtyard & Architectural Campus',
  badge: 'Main Campus',
  description: 'The architectural center of Petros operations, connecting all executive divisions.',
  themeColor: '#3b82f6',
  defaultRoom: 'courtyard',
  rooms: [
    {
      id: 'courtyard',
      label: 'Campus Arrival Plaza',
      description: 'Paved limestone courtyard with reflecting fountain and landscaped campus gardens.',
      accentColor: '#3b82f6',
      cameraPose: {
        position: new THREE.Vector3(26, 18, 32),
        target: new THREE.Vector3(0, 4, 0),
        duration: 1.4,
      },
    },
    {
      id: 'headquarters',
      label: 'Headquarters Tower',
      description: 'The central glass and brushed-steel corporate tower with revolving entrance canopy.',
      accentColor: '#60a5fa',
      cameraPose: {
        position: new THREE.Vector3(0, 6, 22),
        target: new THREE.Vector3(0, 10, -20),
        duration: 1.4,
      },
    },
    {
      id: 'fountain',
      label: 'Plaza Fountain & Promenade',
      description: 'Carved stone water feature with surrounding benches and walking promenades.',
      accentColor: '#0ea5e9',
      cameraPose: {
        position: new THREE.Vector3(12, 5, 14),
        target: new THREE.Vector3(0, 1, 0),
        duration: 1.2,
      },
    },
  ],
  assetRequirements: [
    {
      name: 'monolith-office-tower',
      url: '/models/campus/monolith-office-tower.glb',
      localPath: 'public/models/campus/monolith-office-tower.glb',
      type: 'glb',
    },
    {
      name: 'revolving-entrance-bay',
      url: '/models/campus/revolving-entrance-bay.glb',
      localPath: 'public/models/campus/revolving-entrance-bay.glb',
      type: 'glb',
    },
    {
      name: 'campus-plaza-fountain',
      url: '/models/campus/campus-plaza-fountain.glb',
      localPath: 'public/models/campus/campus-plaza-fountain.glb',
      type: 'glb',
    },
  ],
};
