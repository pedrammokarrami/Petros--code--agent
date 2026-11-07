import * as THREE from 'three';
import { BusinessManifest } from '../types';

export const ResearchManifest: BusinessManifest = {
  id: 'research',
  title: 'Petros AI & Advanced Engineering Lab',
  subtitle: 'HPC Clusters, Neural Synthesis & Diagnostic Benchmarks',
  badge: 'Research Lab',
  description: 'Cutting-edge computational laboratory housing distributed AI server clusters, neural diagnostic interfaces, and experimental sensor arrays.',
  themeColor: '#06b6d4',
  defaultRoom: 'hpc_cluster',
  rooms: [
    {
      id: 'hpc_cluster',
      label: 'HPC Supercomputing Lab',
      description: 'High-density computational cluster floor with liquid cooling manifolds and neural inference diagnostics.',
      accentColor: '#06b6d4',
      cameraPose: {
        position: new THREE.Vector3(8, 6, 8),
        target: new THREE.Vector3(0, 1.4, 0),
        duration: 1.3,
      },
    },
    {
      id: 'neural_bench',
      label: 'Neural Synthesis Pod',
      description: 'Precision diagnostic bench for evaluating deep multimodal architectures and agent reasoning kernels.',
      accentColor: '#3b82f6',
      cameraPose: {
        position: new THREE.Vector3(0, 4.5, 6),
        target: new THREE.Vector3(0, 1.2, -1),
        duration: 1.2,
      },
    },
    {
      id: 'sensor_observatory',
      label: 'Sensor & Telemetry Suite',
      description: 'Real-time telemetry and ambient diagnostic monitoring tracking distributed agent execution health.',
      accentColor: '#14b8a6',
      cameraPose: {
        position: new THREE.Vector3(-6, 5.5, 7),
        target: new THREE.Vector3(1, 1.2, -1),
        duration: 1.3,
      },
    },
  ],
  assetRequirements: [
    {
      name: 'neural-brain-stem',
      url: '/models/research/neural-brain-stem.glb',
      localPath: 'public/models/research/neural-brain-stem.glb',
      type: 'glb',
    },
    {
      name: 'iridescence-optic-sensor',
      url: '/models/research/iridescence-optic-sensor.glb',
      localPath: 'public/models/research/iridescence-optic-sensor.glb',
      type: 'glb',
    },
  ],
};
