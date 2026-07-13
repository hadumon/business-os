import type { EventEmitter } from "./event.js";

export interface PluginContext {
  events: EventEmitter;
  config: Record<string, unknown>;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  setup(ctx: PluginContext): void | Promise<void>;
  teardown?(ctx: PluginContext): void | Promise<void>;
}
