import type { AgentContext, AgentResult } from "@business-os/core";
import type { RegisteredAgent } from "@business-os/sdk";
import { ExecutionContext, type RuntimeDependencies } from "./execution-context.js";
import { InMemoryTelemetrySink, type TelemetrySink } from "./telemetry.js";
import type { RuntimeHooks } from "./hooks.js";

export interface RuntimeOptions {
  dependencies: RuntimeDependencies;
  hooks?: RuntimeHooks;
  telemetry?: TelemetrySink;
  retry?: { maxAttempts: number; backoffMs: number };
}

export class Runtime {
  private ctx: ExecutionContext;
  private hooks: RuntimeHooks;
  private telemetry: TelemetrySink;
  private retry: { maxAttempts: number; backoffMs: number };
  private agents = new Map<string, RegisteredAgent>();

  constructor(options: RuntimeOptions) {
    this.ctx = new ExecutionContext(options.dependencies);
    this.hooks = options.hooks ?? {};
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
    this.retry = options.retry ?? { maxAttempts: 1, backoffMs: 0 };
  }

  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);
  }

  get context(): ExecutionContext {
    return this.ctx;
  }

  async execute(agentId: string, input: Record<string, unknown>): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, error: `No agent registered with id "${agentId}"` };
    }

    if (this.ctx.isCancelled) {
      return { success: false, error: "Execution cancelled" };
    }

    await this.hooks.beforeAgent?.(agentId, this.ctx);
    const start = Date.now();

    const agentCtx: AgentContext = {
      memory: this.ctx.memory,
      artifacts: this.ctx.artifacts,
      events: this.ctx.events,
      input,
    };

    let lastResult: AgentResult = { success: false, error: "not executed" };

    for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt++) {
      if (this.ctx.isCancelled) {
        lastResult = { success: false, error: "Execution cancelled" };
        break;
      }
      try {
        lastResult = await agent.run(agentCtx);
        if (lastResult.success) break;
      } catch (err) {
        await this.hooks.onError?.(agentId, err, this.ctx);
        lastResult = { success: false, error: err instanceof Error ? err.message : String(err) };
      }
      if (attempt < this.retry.maxAttempts && this.retry.backoffMs > 0) {
        await new Promise((r) => setTimeout(r, this.retry.backoffMs));
      }
    }

    this.telemetry.record({
      name: "agent.execute",
      timestamp: start,
      durationMs: Date.now() - start,
      meta: { agentId, success: lastResult.success },
    });

    await this.hooks.afterAgent?.(agentId, lastResult, this.ctx);
    return lastResult;
  }

  cancel(): void {
    this.ctx.cancel();
  }
}
