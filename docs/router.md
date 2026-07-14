# Router

The Router turns a natural-language request into a decision about which agent(s) should handle it.

```
Natural Language
  ↓
Intent Detection
  ↓
Agent Selection
  ↓
Execution Plan
```

Example from the original design goal:

```
User: "My landing page converts poorly."
  ↓
Router
  ↓
Marketing, SEO, Content, Analytics   ← agents bound to the matched intent
```

## The two responsibilities, kept separate

The Router package deliberately splits into two concerns:

1. **Intent detection** — "what is this request about?" This is pluggable (see below).
2. **Agent selection / planning** — "given that intent, which registered agents handle it?" This is fixed logic inside `Router` itself: a lookup from intent → bound agent ids.

Keeping these separate means you can swap out _how_ intent is detected (keyword matching today, an LLM call tomorrow) without touching how agents get registered or how plans are built.

## `IntentDetector`: the pluggable piece

```typescript
interface IntentDetector {
  detect(rawInput: string, availableIntents: string[]): Promise<RouteIntent> | RouteIntent;
}
```

`availableIntents` is passed in on every call — it's the list of intents that currently have at least one agent bound to them, so a detector never needs its own separate registry of valid intents.

### Today: `KeywordIntentDetector`

The default, shipped implementation is intentionally simple and deterministic — no network calls, no cost, no latency:

```typescript
const detector = new KeywordIntentDetector([
  { intent: "seo", keywords: ["seo", "search ranking", "google ranking"] },
  { intent: "marketing", keywords: ["landing page", "conversion", "ads"] },
]);
```

It scores each candidate intent by the fraction of its keywords found in the input (case-insensitive substring match) and returns the highest-scoring match as `detectedIntent`, with that fraction as `confidence`. If nothing matches, `detectedIntent` is `undefined` and `confidence` is `0`.

### Confidence

`RouteIntent.confidence` is a number in `[0, 1]`. `KeywordIntentDetector` computes it as `matchedKeywords / totalKeywords` for the winning rule. Callers (including a future LLM-based detector) are expected to populate this consistently so that downstream logic — e.g. "only auto-route above 0.6 confidence, otherwise ask the user to clarify" — can be written against the interface rather than against any one implementation.

## `Router`

```typescript
const router = new Router(detector);

router.registerAgent(seoAgent, ["seo"]);
router.registerAgent(marketingAgent, ["marketing"]);
// omit the second argument to bind an agent to an intent matching its own id:
router.registerAgent(discoverAgent); // bound to intent "discover"

const intent = await router.route("My landing page converts poorly.");
// { raw: "...", detectedIntent: "marketing", confidence: 0.33 }

const plan = await router.plan(intent);
// { agents: ["marketing-agent"], reasoning: "Matched intent \"marketing\" with confidence 0.33" }
```

Multiple agents can be bound to the same intent — `plan()` returns all of them in registration order, letting a single request fan out to several agents (matching the "Marketing, SEO, Content, Analytics" example above).

## Router → Runtime, not Router → Agent

The Router only produces an `ExecutionPlan` (a list of agent ids). It does not call agents directly — that's the `Runtime`'s job (see [`architecture.md`](./architecture.md)). This split means the Router has no dependency on how agents are executed, retried, or instrumented.

```
Router.plan() → ExecutionPlan { agents: [...] }
                        ↓
              Runtime.execute(agentId, input)   for each agent id in the plan
```

## Future intent detectors

Because `IntentDetector` is an interface, none of the following require changes to `Router` itself:

- **LLM Router** — call a model to classify intent, likely with a structured-output prompt returning `{ intent, confidence }` directly.
- **Hybrid Router** — try `KeywordIntentDetector` first for cheap, fast, high-confidence matches; fall back to an LLM detector only when keyword confidence is low.
- **Plugin Routers** — third-party packages that register their own `IntentDetector`, e.g. one tuned for a specific vertical's vocabulary.

To adopt any of these, construct `new Router(myDetector)` instead of `new Router(new KeywordIntentDetector(...))` — no other code changes.
