/**
 * Petros Business Event Gateway
 * Handles deduplication, live subscriptions, queue processing, and backend event ingest.
 */

import { BusinessEvent, BusinessEventListener } from './eventTypes';

export class BusinessEventGateway {
  private static instance: BusinessEventGateway | null = null;
  private listeners: Set<BusinessEventListener> = new Set();
  private processedIds: Set<string> = new Set();
  private eventHistory: BusinessEvent[] = [];
  private readonly MAX_HISTORY = 120;

  private constructor() {
    this.initBackendStream();
  }

  public static getInstance(): BusinessEventGateway {
    if (!BusinessEventGateway.instance) {
      BusinessEventGateway.instance = new BusinessEventGateway();
    }
    return BusinessEventGateway.instance;
  }

  public subscribe(listener: BusinessEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public publish(event: BusinessEvent): boolean {
    if (!event.id || this.processedIds.has(event.id)) {
      return false; // Deduplicated
    }

    this.processedIds.add(event.id);
    if (this.processedIds.size > 1000) {
      // Keep processedIds bounded
      const idsArray = Array.from(this.processedIds);
      this.processedIds = new Set(idsArray.slice(idsArray.length - 500));
    }

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.pop();
    }

    // Notify all active subscribers
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[BusinessEventGateway] Listener error:', err);
      }
    }

    return true;
  }

  public getRecentEvents(limit: number = 20): BusinessEvent[] {
    return this.eventHistory.slice(0, limit);
  }

  /**
   * Listens to server-side SSE or poll endpoint for real system and agent events.
   */
  private initBackendStream(): void {
    if (typeof window === 'undefined') return;

    // Listen to real custom events on window if emitted by services
    window.addEventListener('petros:backend_event', ((e: CustomEvent<BusinessEvent>) => {
      if (e.detail) {
        this.publish(e.detail);
      }
    }) as EventListener);
  }
}

export const eventGateway = BusinessEventGateway.getInstance();
