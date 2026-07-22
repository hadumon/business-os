# Multi-Agent Pipelines

`Pipeline` (`packages/workflow`) orchestrates multi-agent execution sequences. While `Workflow` handles intra-agent steps (stages inside a single agent's `execute`), `Pipeline` connects independent agents end-to-end (inter-agent).

## Intra-Agent Workflow vs Inter-Agent Pipeline

| Concept | Scope | Class | Example |
| :--- | :--- | :--- | :--- |
| **Workflow** | Inside 1 Agent | `Workflow` | Discover agent: Market Scan -> Competitor Analysis -> Opportunity Score |
| **Pipeline** | Across N Agents | `Pipeline` | Full business cycle: Discover -> Strategy -> Product -> Catalog -> Inventory -> Analytics |

## Pipeline Step Structure

Each `PipelineStep` declares:
1. `agentId` — the target agent to run
2. `inputBuilder(prev, pipelineInput, collectedArtifacts)` — function returning the input object passed to `Runtime.execute()`
3. `artifactExtractor(result)` — optional function extracting the output artifact id so downstream steps can receive it via `--from` forwarding

```typescript
export interface PipelineStep {
  agentId: string;
  inputBuilder: (
    prev: AgentResult | undefined,
    pipelineInput: Record<string, unknown>,
    collectedArtifacts: Record<string, string>,
  ) => Record<string, unknown>;
  artifactExtractor?: (result: AgentResult) => string | undefined;
}
```

## Available Presets (Dasna Pack)

The `@dasna/pipelines` pack provides three standard pipeline presets:

1. **`operations`** (`catalog -> inventory -> analytics`):
   Runs catalog validation, inventory stock health analysis, and cross-domain analytics synthesis.

2. **`market-to-prd`** (`discover -> strategy -> product`):
   Performs market research, formulates a strategy artifact, and derives a Product Requirements Document (PRD).

3. **`full-cycle`** (`discover -> strategy -> product -> catalog -> inventory -> analytics`):
   Executes the entire end-to-end business cycle in a single automated pass.

## CLI Usage

```bash
# List all registered pipeline presets
bos pipeline list

# Inspect steps of a specific pipeline
bos pipeline show operations

# Preview execution steps (dry run)
bos pipeline run operations -p dasna --dry-run

# Run a pipeline
bos pipeline run operations -p dasna
bos pipeline run market-to-prd -p dasna -t "luxury sleep products"
```

## Execution & Halt Behavior

- Steps run sequentially in the order defined.
- Output artifacts from upstream steps are stored in `collectedArtifacts` and forwarded to downstream steps.
- Real-time progress is emitted via the `SimpleEventEmitter` event system (`pipeline.step.started`, `pipeline.step.completed`, `pipeline.step.failed`).
- If any agent step fails, execution halts immediately and reports the failing step and error.
