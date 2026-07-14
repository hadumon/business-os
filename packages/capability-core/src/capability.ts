import type { Memory, Logger } from "@business-os/core";

/**
 * The context a capability runs with. Deliberately narrower than AgentContext —
 * capabilities don't create artifacts directly; they return structured data
 * that the calling agent decides what to do with (including turning it into
 * an artifact). This keeps capabilities composable and side-effect-light.
 */
export interface CapabilityContext {
  memory: Memory;
  logger: Logger;
}

export interface CapabilityDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  run(ctx: CapabilityContext, input: TInput): Promise<TOutput> | TOutput;
}

export interface RunnableCapability<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  run(ctx: CapabilityContext, input: TInput): Promise<TOutput>;
}
