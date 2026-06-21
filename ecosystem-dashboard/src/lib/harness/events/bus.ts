import type { HarnessEvent } from '../types';

export type HarnessEventHandler = (event: HarnessEvent) => void | Promise<void>;

class HarnessEventBus {
  private readonly handlers = new Map<string, Set<HarnessEventHandler>>();

  subscribe(eventType: string, handler: HarnessEventHandler): () => void {
    const currentHandlers = this.handlers.get(eventType) || new Set<HarnessEventHandler>();
    currentHandlers.add(handler);
    this.handlers.set(eventType, currentHandlers);

    return () => {
      const activeHandlers = this.handlers.get(eventType);
      if (!activeHandlers) {
        return;
      }

      activeHandlers.delete(handler);
      if (activeHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async emit(event: HarnessEvent): Promise<void> {
    const typedHandlers = this.handlers.get(event.type) || new Set<HarnessEventHandler>();
    const wildcardHandlers = this.handlers.get('*') || new Set<HarnessEventHandler>();

    const toCall = Array.from(typedHandlers).concat(Array.from(wildcardHandlers));
    await Promise.all(
      toCall.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.warn('[harness-event-bus] handler failed:', error);
        }
      }),
    );
  }
}

export const harnessEventBus = new HarnessEventBus();
