# Architecture

BusinessOS is a framework for building autonomous business agents. This document explains how the pieces fit together and why they're separated the way they are.

## Mental model: two products, one repo

Think of this repository as two things sharing a monorepo, not one thing:

```
businessos-framework       businessos-business-pack
(packages/*)                (agents/*)
```

- **The framework** (`core`, `sdk`, `router`, `workflow`, `memory`, `artifact-core`, `artifact-files`, `artifact-sqlite`, `artifacts`, `runtime`) knows nothing about business logic. It has no idea what a "PRD" or a "Discover Agent" is for. It only knows about agents, workflows, memory, and artifacts as abstract concepts.
- **The business pack** (`agents/*`) knows nothing about how memory is stored on disk or how the router matches keywords. It only calls `defineAgent()` and reads/writes through the interfaces the framework exposes.

If a change to `agents/discover` ever requires editing a file in `packages/router`, that's a sign the boundary has leaked.

## Request lifecycle

This is the path a single user request takes through the system:

```
User
  ↓
Router          — turns natural language into an intent + execution plan
  ↓
Runtime         — the only thing that actually invokes agents
  ↓
Workflow        — (optional) multi-step graph execution inside a single agent turn
  ↓
Agent           — business logic, defined via defineAgent()
  ↓
Memory          — durable notes, docs, state (Markdown + SQLite)
  ↓
Artifacts       — versioned, immutable outputs (reports, PRDs, plans)
  ↓
Response
```

Not every request touches every layer — a simple agent might skip Workflow entirely and go straight from Runtime to Agent to Response. Workflow exists for agents whose execution is itself a multi-node pipeline (e.g. Discover: Market Scan → Problem Discovery → Competitor Analysis → ...).

## Why the Runtime sits between Router and Agent

Early versions of the framework had the Router call agents directly. This package (`packages/runtime`, added in Phase 7.5) was introduced because agent execution has cross-cutting concerns that don't belong in the Router or in individual agents:

- dependency injection (memory, artifacts, events)
- execution context and cancellation
- retries with backoff
- lifecycle hooks (`beforeAgent`, `afterAgent`, `onError`)
- telemetry

Centralizing these in `Runtime` keeps agents small — an agent's `execute()` function only contains business logic, never retry loops or logging boilerplate.

```
Router
  ↓
Runtime   ← dependency injection, retries, hooks, telemetry, cancellation live here
  ↓
Agent
```

## Package layering

Packages depend downward only. There are no circular dependencies (verified via `madge --circular` in CI).

```
core                          — interfaces only, zero dependencies
  ↑
sdk, router, workflow,        — implementations of core interfaces
memory, artifact-core
  ↑
artifact-files, artifact-sqlite   — storage backends for artifact-core
  ↑
artifacts                     — wires artifact-core + artifact-files + artifact-sqlite
  ↑
runtime                       — depends on everything above; the composition root
  ↑
agents/*                      — business pack; depends on runtime + sdk only
```

`core` is the only package with zero dependencies. Every other framework package implements one or more interfaces defined in `core`. This means a new storage backend (e.g. swapping `node:sqlite` for Postgres, or `FileMemory` for an S3-backed store) only requires a new package that implements the same `core` interface — nothing upstream changes.

## Storage philosophy

BusinessOS uses hybrid storage rather than one database for everything:

- **Markdown** for anything a human should be able to read, diff, and edit directly (`.business/artifacts/**/*.md`, memory notes).
- **SQLite** for anything that needs to be queried, indexed, or related to other records (artifact metadata, version chains, relationship graphs).

See [`memory.md`](./memory.md) and [`artifacts.md`](./artifacts.md) for the full reasoning.

## Extension points

The framework is designed to be extended without modification:

- **New agents** — write a new package under `agents/`, call `defineAgent()`, register it with a `Runtime`. No framework code changes.
- **New intent detection** — implement the `IntentDetector` interface (see [`router.md`](./router.md)) and pass it to `Router` instead of `KeywordIntentDetector`.
- **New artifact types** — `ArtifactType` is a string union in `artifact-core`; new types don't require new packages.
- **New storage backends** — implement the relevant `core` interface (`Memory`, `ArtifactManager`) and swap the implementation passed into `Runtime`.

## What's frozen as of v0.1.0-alpha

The following interfaces are frozen. Changing their shape requires a new major version:

- `Agent`, `AgentContext`, `AgentResult` (`core`)
- `Memory`, `MemoryDocument`, `MemoryQuery` (`core`)
- `Workflow`, `WorkflowNode` (`core`)
- `Router`, `RouteIntent`, `ExecutionPlan` (`core`)
- `Artifact`, `ArtifactMetadata`, `ArtifactManager` (`artifact-core`)

Implementations of these interfaces (e.g. `FileMemory`, `SqliteArtifactManager`, `KeywordIntentDetector`) are **not** frozen and may change or be replaced.

## Related documents

- [`agent-api.md`](./agent-api.md) — how to write an agent with `defineAgent()`
- [`workflow.md`](./workflow.md) — multi-node execution inside an agent
- [`memory.md`](./memory.md) — the Markdown + SQLite hybrid store
- [`artifacts.md`](./artifacts.md) — immutable, versioned outputs
- [`router.md`](./router.md) — intent detection and execution planning
- [`capabilities.md`](./capabilities.md) — reusable business logic shared across agents
- [`cli.md`](./cli.md) — the `bos` command-line interface
