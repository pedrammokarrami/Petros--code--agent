import * as THREE from 'three';
import { BusinessManifest } from '../types';

export const AgencyManifest: BusinessManifest = {
  id: 'agency',
  title: 'Petros Creative Agency & Consulting',
  subtitle: 'Executive Client Operations & Project Management Suite',
  badge: 'Agency Hub',
  description: 'High-end corporate consulting floor featuring executive client suites, boardroom, and project coordination centers.',
  themeColor: '#8b5cf6',
  defaultRoom: 'executive_suite',
  rooms: [
    {
      id: 'executive_suite',
      label: 'Executive Client Suite',
      description: 'Modern glass-lined consulting suite with designer seating, warm ambient light, and panoramic terrace views.',
      accentColor: '#8b5cf6',
      cameraPose: {
        position: new THREE.Vector3(7, 5, 8),
        target: new THREE.Vector3(0, 1.2, 0),
        duration: 1.3,
      },
    },
    {
      id: 'boardroom',
      label: 'Strategy Boardroom',
      description: 'Collaborative strategy conference center with presentation displays and client negotiation table.',
      accentColor: '#a78bfa',
      cameraPose: {
        position: new THREE.Vector3(0, 6, 9),
        target: new THREE.Vector3(0, 1.5, -2),
        duration: 1.3,
      },
    },
    {
      id: 'operations_floor',
      label: 'Operations Coordination',
      description: 'Multi-workstation project delivery floor tracking client deliverables and team dispatch.',
      accentColor: '#c084fc',
      cameraPose: {
        position: new THREE.Vector3(-6, 7, 7),
        target: new THREE.Vector3(2, 1, -1),
        duration: 1.3,
      },
    },
  ],
  assetRequirements: [
    {
      name: 'sheen-chair',
      url: '/models/agency/sheen-chair.glb',
      localPath: 'public/models/agency/sheen-chair.glb',
      type: 'glb',
    },
    {
      name: 'executive-chair',
      url: '/models/agency/executive-chair.glb',
      localPath: 'public/models/agency/executive-chair.glb',
      type: 'glb',
    },
    {
      name: 'glass-vase-flowers',
      url: '/models/agency/glass-vase-flowers.glb',
      localPath: 'public/models/agency/glass-vase-flowers.glb',
      type: 'glb',
    },
  ],
};
