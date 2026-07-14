import type { RunnableCapability, CapabilityContext } from "./capability.js";

const registry = new Map<string, RunnableCapability>();

export function defineCapability<TInput, TOutput>(config: {
  id: string;
  description?: string;
  run(ctx: CapabilityContext, input: TInput): Promise<TOutput> | TOutput;
}): RunnableCapability<TInput, TOutput> {
  if (registry.has(config.id)) {
    throw new Error(`Capability with id "${config.id}" is already registered`);
  }

  const capability: RunnableCapability<TInput, TOutput> = {
    id: config.id,
    ...(config.description !== undefined ? { description: config.description } : {}),
    run: async (ctx, input) => config.run(ctx, input),
  };

  registry.set(config.id, capability as RunnableCapability);
  return capability;
}

export function getCapability(id: string): RunnableCapability | undefined {
  return registry.get(id);
}

export function listCapabilities(): RunnableCapability[] {
  return Array.from(registry.values());
}

/** Test-only: clears the module-level registry. */
export function __resetCapabilityRegistry(): void {
  registry.clear();
}
