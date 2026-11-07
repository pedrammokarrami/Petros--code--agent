import * as THREE from 'three';
import { BusinessManifest } from '../types';

export const CommerceManifest: BusinessManifest = {
  id: 'commerce',
  title: 'Petros Omnichannel Commerce & Fulfillment',
  subtitle: 'Automated Logistics, Warehouse & Product Showroom',
  badge: 'Commerce Center',
  description: 'Smart commercial hub managing e-commerce sales, warehouse inventory, order packing, and distribution dispatch.',
  themeColor: '#f59e0b',
  defaultRoom: 'fulfillment',
  rooms: [
    {
      id: 'fulfillment',
      label: 'Fulfillment & Dispatch Bay',
      description: 'Active logistics distribution center with automated packaging stations and dispatch loading areas.',
      accentColor: '#f59e0b',
      cameraPose: {
        position: new THREE.Vector3(9, 7, 10),
        target: new THREE.Vector3(0, 1.5, 0),
        duration: 1.3,
      },
    },
    {
      id: 'retail_showroom',
      label: 'Omnichannel Showroom',
      description: 'Modern product retail gallery showcasing active merchandise, pricing, and live inventory levels.',
      accentColor: '#fbbf24',
      cameraPose: {
        position: new THREE.Vector3(0, 5, 8),
        target: new THREE.Vector3(0, 1.2, -1),
        duration: 1.3,
      },
    },
    {
      id: 'logistics_yard',
      label: 'Fleet Logistics Yard',
      description: 'Exterior transport staging area where delivery vehicles and freight transports coordinate shipping.',
      accentColor: '#d97706',
      cameraPose: {
        position: new THREE.Vector3(14, 8, 12),
        target: new THREE.Vector3(2, 1, -2),
        duration: 1.4,
      },
    },
  ],
  assetRequirements: [
    {
      name: 'shipping-box-animated',
      url: '/models/commerce/shipping-box-animated.glb',
      localPath: 'public/models/commerce/shipping-box-animated.glb',
      type: 'glb',
    },
    {
      name: 'retail-water-bottle',
      url: '/models/commerce/retail-water-bottle.glb',
      localPath: 'public/models/commerce/retail-water-bottle.glb',
      type: 'glb',
    },
    {
      name: 'delivery-logistics-truck',
      url: '/models/commerce/delivery-logistics-truck.glb',
      localPath: 'public/models/commerce/delivery-logistics-truck.glb',
      type: 'glb',
    },
    {
      name: 'shipping-crate',
      url: '/models/commerce/shipping-crate.glb',
      localPath: 'public/models/commerce/shipping-crate.glb',
      type: 'glb',
    },
  ],
};
