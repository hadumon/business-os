import type { AgentResult } from "@business-os/core";
import type { ExecutionContext } from "./execution-context.js";

export interface RuntimeHooks {
  beforeAgent?: (agentId: string, ctx: ExecutionContext) => void | Promise<void>;
  afterAgent?: (
    agentId: string,
    result: AgentResult,
    ctx: ExecutionContext,
  ) => void | Promise<void>;
  onError?: (agentId: string, error: unknown, ctx: ExecutionContext) => void | Promise<void>;
}
