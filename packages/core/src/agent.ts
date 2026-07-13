import type { Memory } from "./memory.js";
import type { ArtifactManager } from "./artifact.js";
import type { EventEmitter } from "./event.js";

export interface AgentContext {
  memory: Memory;
  artifacts: ArtifactManager;
  events: EventEmitter;
  input: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface AgentDefinition {
  id: string;
  description?: string;
  execute(ctx: AgentContext): Promise<AgentResult>;
}
