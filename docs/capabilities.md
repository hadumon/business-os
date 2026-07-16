# Capabilities

Capabilities are small, reusable units of business logic shared across agents. They sit between the framework and the business pack: framework packages don't know they exist, but every agent can compose them.

```
Framework
  ↓
Capabilities   (market-research, competitor-analysis, swot, pricing, ...)
  ↓
Agents         (Discover, Strategy, Product, ...)
```

## Why capabilities exist

Before this layer, Discover contained all of its own analysis logic inline. When Strategy needed the same market research and competitor analysis Discover already did, the only options were: duplicate the code, or make Strategy depend on Discover directly (coupling two agents that should be independent). Capabilities solve this by extracting the reusable logic into its own layer that both agents depend on instead of depending on each other.

```
Before                          After
Discover: 200 LOC analysis      Discover: pipeline of capability calls
Strategy: 180 LOC analysis      Strategy: pipeline of capability calls
(mostly duplicated)             (capabilities defined once, in packages/capabilities)
```

## The `CapabilityContext`

Capabilities run with a deliberately narrow context — narrower than `AgentContext`:

```typescript
interface CapabilityContext {
  memory: Memory;
  logger: Logger;
}
```

Capabilities do **not** receive `artifacts` or `events`. This is intentional: capabilities return structured data: they don't create artifacts themselves, and they don't participate in the event bus. Only the calling agent decides what to do with a capability's output — whether that's rendering it into an artifact, feeding it to another capability, or discarding it. This keeps capabilities composable and side-effect-light; a capability can always be called from a plain unit test without any artifact or event infrastructure.

## Defining a capability

```typescript
import { defineCapability } from "@business-os/capability-core";

export const myCapability = defineCapability<MyInput, MyOutput>({
  id: "my-capability",
  description: "One sentence describing what this does.",
  run: async (ctx, input) => {
    ctx.logger.debug("doing the thing", { input });
    return { /* structured output */ };
  },
});
```

`defineCapability` registers the capability in a module-level registry (mirroring `defineAgent`'s pattern) and returns a `RunnableCapability` that any agent can call directly:

```typescript
const research = await marketResearchCapability.run(capCtx, { topic: "b2b saas" });
```

Most agents call capabilities directly via their exported reference (as above) rather than looking them up by id through the registry — the registry exists mainly for introspection and future tooling (e.g. a `bos capabilities` listing command), not as the primary calling convention.

## Capabilities shipped as of v0.4.0-alpha

All defined in `packages/capabilities`:

| Capability | id | Input | Output |
|---|---|---|---|
| Market Research | `market-research` | `{ topic }` | signals, problem statement, pain points |
| Competitor Analysis | `competitor-analysis` | `{ topic }` | list of competitors with relative strength |
| Demand Validation | `demand-validation` | `{ signals, competitors }` | a 0–100 demand score |
| Opportunity Scoring | `opportunity-scoring` | `{ demandScore, competitorCount }` | a 0–100 opportunity score |
| SWOT | `swot` | `{ topic, signals, competitors }` | strengths/weaknesses/opportunities/threats |
| Pricing | `pricing` | `{ topic, opportunityScore }` | a business model recommendation |
| Risk Analysis | `risk-analysis` | `{ competitors, opportunityScore }` | a list of risks with severity |

All current implementations are heuristic placeholders — deterministic functions of their inputs, not calls to external market data or AI models. Each is isolated in its own file specifically so a real data source (a market intelligence API, a competitor-tracking service, an LLM call) can replace the body of any one capability without changing its signature or touching any agent that calls it.

## Which agents use which capabilities

- **Discover** composes all seven capabilities, run in sequence via a `Workflow` (see [`workflow.md`](./workflow.md)), producing a Discovery Report.
- **Strategy** composes six of the seven (everything except risk-analysis) directly — not through a `Workflow`, since its execution is a straight sequence with no retry/branching needs — producing a Strategy Report.
- **Product** uses **no capabilities**. It reads an existing Strategy artifact's content and transforms it into a PRD. This is a deliberately different agent shape — not every agent is a capability pipeline; some are artifact transformers. See [`agent-api.md`](./agent-api.md) for more on agent shapes.

## Testing capabilities

Because `CapabilityContext` only needs `memory` and `logger`, capabilities are trivial to unit test without any artifact or filesystem infrastructure:

```typescript
const testCtx: CapabilityContext = {
  memory: { read: async () => null, write: async () => ({} as never), query: async () => [], delete: async () => {} },
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};

const result = await marketResearchCapability.run(testCtx, { topic: "ai meeting notes" });
expect(result.signals.length).toBeGreaterThan(0);
```

See `packages/capabilities/src/capabilities.test.ts` for the full suite.

## Adding a new capability

1. Create a new file in `packages/capabilities/src/`.
2. Define input/output TypeScript types in `types.ts` (or locally if only one capability uses them).
3. Call `defineCapability` with a unique `id`.
4. Export it from `packages/capabilities/src/index.ts`.
5. Add unit tests.
6. Have any agent that needs it import and call it directly — no framework changes required.