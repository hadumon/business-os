# Workflow

`Workflow` (`packages/workflow`) is for agents whose execution is itself a pipeline of steps, rather than a single function call. Not every agent needs one — a simple agent's `execute()` can just be a function body. Reach for `Workflow` when an agent's logic naturally breaks into named, independently retryable stages.

## Model

```
Node → Node → Node → Node
```

Each node:

```
Start
  ↓
Execute
  ↓
Retry (if it throws, up to maxAttempts)
  ↓
Complete (or Failed, if retries are exhausted)
  ↓
Emit Events
```

A canonical example from the roadmap — a Discover agent's internal pipeline:

```
Market Scan
  ↓
Problem Discovery
  ↓
Competitor Analysis
  ↓
Demand Validation
  ↓
Opportunity Score
```

Each stage is a `WorkflowNode`. The output of one node becomes the input to the next.

## Defining a workflow

```typescript
import { Workflow } from "@business-os/workflow";
import type { WorkflowNodeDefinition } from "@business-os/workflow";

const nodes: WorkflowNodeDefinition[] = [
  {
    id: "market-scan",
    run: async (input: { topic: string }) => {
      const signals = await scanMarket(input.topic);
      return { topic: input.topic, signals };
    },
  },
  {
    id: "competitor-analysis",
    retry: { maxAttempts: 3, backoffMs: 500 }, // external API call, worth retrying
    run: async (input: { topic: string; signals: string[] }) => {
      const competitors = await analyzeCompetitors(input.signals);
      return { ...input, competitors };
    },
  },
  {
    id: "opportunity-score",
    run: async (input) => ({ ...input, score: computeScore(input) }),
  },
];

const workflow = new Workflow("discover-pipeline", nodes);
await workflow.start({ topic: "b2b saas" });
```

## Execution order today: linear

As of v0.1.0-alpha, `Workflow` executes nodes **linearly** — in the array order you pass to the constructor, with each node's output feeding the next node's input. This matches the majority of business-pack use cases described in the roadmap (Discover, Strategy → PRD → Roadmap → Sprint Plan).

## Designed for DAG support, not yet implemented

The node shape is already DAG-ready, so branching execution can be added later **without a breaking change** to `WorkflowNodeDefinition`:

```typescript
export interface WorkflowNodeDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  /** Explicit downstream node ids. Omit to fall back to array order (linear mode). */
  next?: string[];
  retry?: NodeRetryConfig;
  run(input: TInput): Promise<TOutput> | TOutput;
}
```

If you don't set `next`, the engine falls back to array order — this is what "linear mode" means internally. When branching execution is implemented, setting `next: ["nodeA", "nodeB"]` on a node will fan out to multiple downstream nodes instead of the engine assuming a single successor. **Existing linear workflows will keep working unchanged** when that lands, since omitting `next` will continue to mean "linear."

Do not build agents today that depend on multiple entries in `next` being executed — only the first declared successor runs in v0.1.0-alpha.

## Retries

Retries are per-node, not per-workflow:

```typescript
{
  id: "flaky-external-call",
  retry: { maxAttempts: 3, backoffMs: 500 },
  run: async (input) => { /* may throw */ },
}
```

If a node exhausts its retries, the whole workflow stops and reports failure — later nodes do not run. A node without a `retry` config gets `maxAttempts: 1` (no retry).

## Events

Every `Workflow` instance exposes an `events` emitter you can subscribe to:

```typescript
workflow.events.on("node.started", (e) => console.log(e.payload));
workflow.events.on("node.retrying", (e) => console.log(e.payload));
workflow.events.on("node.completed", (e) => console.log(e.payload));
workflow.events.on("node.failed", (e) => console.log(e.payload));
workflow.events.on("workflow.started", (e) => console.log(e.payload));
workflow.events.on("workflow.completed", (e) => console.log(e.payload));
workflow.events.on("workflow.failed", (e) => console.log(e.payload));
```

This is how you'd stream progress out of a long-running agent (e.g. via `ctx.events` inside `defineAgent`, forwarding workflow events as they happen).

## Inspecting state

```typescript
const state = workflow.getState();
// [{ nodeId: "market-scan", status: "complete", attempts: 1, output: {...}, ... }, ...]
```

Useful for debugging, telemetry, or resuming/inspecting a workflow's progress after the fact.

## Relationship to Artifacts and Memory

`Workflow` itself doesn't touch memory or artifacts directly — that's intentional. A node's `run()` function receives plain input/output; if a node needs to write an artifact or read memory, do it inside that node's `run()`, using the same `Memory`/`ArtifactManager` instances the enclosing agent was given via `ctx`. This keeps `Workflow` a pure execution engine, decoupled from storage.

```typescript
{
  id: "write-report",
  run: async (input, /* close over ctx.artifacts from the enclosing agent */) => {
    const artifact = await ctx.artifacts.create({ ... });
    return { ...input, artifactId: artifact.metadata.id };
  },
}
```

## Relationship to Runtime

`Runtime` executes _agents_; `Workflow` executes _nodes within a single agent's `execute()` call_. An agent can internally construct and run a `Workflow` as part of its own logic — the Runtime has no special awareness of workflows, it only sees the agent's final `AgentResult`.
