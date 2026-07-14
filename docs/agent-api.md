# Agent API

After reading this page you should be able to write an agent without looking at any framework source code.

## Minimal example

```typescript
import { defineAgent, z } from "@business-os/sdk";

export const helloAgent = defineAgent({
  id: "hello",
  inputSchema: z.object({ name: z.string() }),
  outputSchema: z.object({ greeting: z.string() }),
  execute: async (ctx) => {
    return { greeting: `Hello, ${ctx.input.name}!` };
  },
});
```

That's the entire contract. `defineAgent` handles validation, logging, error wrapping, and registration for you.

## `defineAgent(config)`

| Field          | Required | Description                                                                                                                                                          |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | yes      | Unique string identifier. Registering two agents with the same `id` throws.                                                                                          |
| `description`  | no       | Human-readable summary, useful for router bindings and docs generation.                                                                                              |
| `inputSchema`  | no       | A Zod schema. If provided, `ctx.input` is validated and parsed before `execute` runs. Invalid input returns `{ success: false, error }` — `execute` is never called. |
| `outputSchema` | no       | A Zod schema. If provided, the return value of `execute` is validated before being returned. Invalid output returns `{ success: false, error }`.                     |
| `execute`      | yes      | `(ctx) => output \| Promise<output>`. Your business logic.                                                                                                           |

## Lifecycle

```
defineAgent() called
      ↓
agent registered in module-level registry
      ↓
   ... later, at request time ...
      ↓
Runtime.execute(agentId, input) called
      ↓
input validated against inputSchema (if provided)
      ↓
  invalid? → return { success: false, error } — execute() never runs
      ↓
  valid → execute(ctx) called
      ↓
execute() returns or throws
      ↓
  threw? → wrapped as AgentExecutionError, return { success: false, error }
      ↓
output validated against outputSchema (if provided)
      ↓
  invalid? → return { success: false, error }
      ↓
return { success: true, output }
```

Every step logs through the agent's own `Logger` (see below), so a failed run is traceable without extra instrumentation.

## The execution context (`ctx`)

Inside `execute`, `ctx` gives you everything the agent is allowed to touch:

```typescript
execute: async (ctx) => {
  ctx.input; // your validated input, typed from inputSchema
  ctx.memory; // Memory — read/write/query/delete durable notes
  ctx.artifacts; // ArtifactManager — create/update/get/list versioned outputs
  ctx.events; // EventEmitter — emit/listen for framework events
  ctx.logger; // Logger — debug/info/warn/error, auto-tagged with your agent id
};
```

Agents never construct these themselves — they're injected by whichever `Runtime` instance executes the agent. This is what makes agents testable: in a test, you can hand `execute` a fake `memory` and `artifacts` without touching disk.

### `ctx.memory`

```typescript
await ctx.memory.write("discover-notes.md", "# Findings\n\n...");
const doc = await ctx.memory.read("discover-notes.md");
const matches = await ctx.memory.query({ keyword: "stripe", path: "reports" });
await ctx.memory.delete("scratch.md");
```

Full details: [`memory.md`](./memory.md).

### `ctx.artifacts`

```typescript
const report = await ctx.artifacts.create({
  project: "acme",
  type: "strategy",
  title: "Q3 Strategy",
  content: "# Strategy\n\n...",
  author: `agent:${ctx.input.agentId ?? "strategy"}`,
});

// Later, in a different agent:
await ctx.artifacts.linkRelationship(strategyId, prdId, "generated");
```

**Never mutate an artifact in place.** Calling `update()` always creates a new immutable version — there is no `overwrite()`. Full details: [`artifacts.md`](./artifacts.md).

### `ctx.events`

```typescript
ctx.events.emit({
  id: `${ctx.input.runId}-progress`,
  type: "discover.progress",
  timestamp: Date.now(),
  source: "agent:discover",
  payload: { stage: "competitor-analysis", percent: 40 },
});
```

Useful for reporting progress out of a long-running agent, or for one agent to react to another's events without a direct dependency.

### `ctx.logger`

```typescript
ctx.logger.info("Starting competitor scan", { competitorCount: 12 });
ctx.logger.error("Scan failed", { err });
```

Every log line is automatically prefixed with a timestamp, level, and your agent's `id` — you don't need to repeat the agent name in every message.

## Input/output schemas

Schemas are plain [Zod](https://zod.dev) schemas, re-exported from `@business-os/sdk` so you don't need to add `zod` as a direct dependency:

```typescript
import { z } from "@business-os/sdk";
```

Guidelines:

- **Always provide `inputSchema`** for agents that will be called by the Router or by other agents — it's your only defense against malformed input reaching business logic.
- **Provide `outputSchema`** when other agents or the Workflow engine will consume your output — it documents the contract and catches regressions early.
- Schemas double as documentation. A well-typed `inputSchema` tells the next contributor exactly what your agent needs, without them opening `execute`.

## Error handling

Don't catch-and-swallow inside `execute` unless you're deliberately returning a partial result. Let errors throw — the SDK wraps them into a structured failure automatically:

```typescript
execute: async (ctx) => {
  const data = await fetchExternalApi(); // throws on failure
  return { data };
  // if fetchExternalApi() throws, defineAgent wraps it:
  // { success: false, error: "Execution failed for agent \"my-agent\"" }
};
```

If you need a custom, catchable failure mode (e.g. "no results found" isn't really an error), model it in your `outputSchema` instead of throwing:

```typescript
outputSchema: z.object({
  found: z.boolean(),
  results: z.array(z.string()).optional(),
}),
```

## Registering with the Router

`defineAgent()` only registers the agent in a local module registry — it does **not** make the agent reachable from natural language. To wire it into intent-based routing:

```typescript
import { Router, KeywordIntentDetector } from "@business-os/router";

const router = new Router(
  new KeywordIntentDetector([
    { intent: "market-research", keywords: ["market", "competitors", "opportunity"] },
  ]),
);

router.registerAgent(discoverAgent, ["market-research"]);
```

See [`router.md`](./router.md) for the full routing model.

## Registering with the Runtime

Routing decides _which_ agent should run. The `Runtime` is what actually runs it:

```typescript
import { Runtime } from "@business-os/runtime";

const runtime = new Runtime({
  dependencies: { memory, artifacts },
  retry: { maxAttempts: 3, backoffMs: 500 },
});

runtime.register(discoverAgent);

const result = await runtime.execute("discover", { topic: "b2b saas" });
```

## Testing an agent

Because dependencies are injected via `ctx`, agents are trivially unit-testable without a real filesystem or database:

```typescript
import { describe, it, expect } from "vitest";
import type { AgentContext } from "@business-os/core";

const mockCtx = (input: unknown): AgentContext => ({
  memory: {
    read: async () => null,
    write: async () => ({}) as never,
    query: async () => [],
    delete: async () => {},
  },
  artifacts: {} as never, // stub only what your agent actually calls
  events: { emit: () => {}, on: () => {}, off: () => {} },
  input: input as Record<string, unknown>,
});

it("greets the given name", async () => {
  const result = await helloAgent.run(mockCtx({ name: "Claude" }));
  expect(result.success).toBe(true);
  expect(result.output).toEqual({ greeting: "Hello, Claude!" });
});
```

For full integration tests that exercise real memory and artifact storage, see the pattern in `packages/runtime/src/runtime.integration.test.ts`.
