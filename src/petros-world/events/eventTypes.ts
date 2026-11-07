/**
 * Petros Real Business Event Types
 */

import { BusinessDomain } from '../business/types';

export type EventCategory = 'commerce' | 'agency' | 'content' | 'research' | 'system';

export interface BusinessEvent {
  id: string;
  category: EventCategory;
  domain: BusinessDomain;
  type: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: number;
  agentId?: string;
  severity?: 'info' | 'success' | 'warning' | 'active';
}

export type BusinessEventListener = (event: BusinessEvent) => void;
