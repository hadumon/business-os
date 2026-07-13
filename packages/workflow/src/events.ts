import type { Event, EventEmitter, EventHandler } from "@business-os/core";

export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "node.started"
  | "node.retrying"
  | "node.completed"
  | "node.failed";

export class SimpleEventEmitter implements EventEmitter {
  private handlers = new Map<string, Set<EventHandler>>();

  emit<TPayload>(event: Event<TPayload>): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    for (const handler of set) {
      void handler(event);
    }
  }

  on<TPayload>(type: string, handler: EventHandler<TPayload>): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler as EventHandler);
  }

  off<TPayload>(type: string, handler: EventHandler<TPayload>): void {
    this.handlers.get(type)?.delete(handler as EventHandler);
  }
}
