# Memory

Memory is where agents keep durable notes, working state, and context that isn't itself a finished deliverable. If an agent produces something meant to be reviewed, versioned, and referenced by other agents, that's an **artifact**, not memory — see [`artifacts.md`](./artifacts.md) for that distinction.

## Why hybrid storage

BusinessOS deliberately does not put everything in one database. Two very different access patterns show up constantly:

1. **"I want to read this like a document."** Notes, vision statements, research summaries — content a human or an LLM wants to read as continuous prose, diff in git, and edit by hand if needed.
2. **"I want to query, filter, and relate this."** Structured facts — timestamps, tags, relationships between records — that benefit from indexes and joins.

Forcing (1) into a database means burying prose in a `TEXT` column where it can't be diffed or opened by a normal editor. Forcing (2) into files means re-implementing query logic by hand-parsing Markdown. So the framework uses both, each for what it's good at:

```
Markdown   → documents (readable, diffable, git-friendly)
SQLite     → structured data + relationships (queryable, indexed)
```

## The `Memory` interface

Defined in `core`, implemented by `FileMemory` in `packages/memory`:

```typescript
interface Memory {
  read(path: string): Promise<MemoryDocument | null>;
  write(path: string, content: string): Promise<MemoryDocument>;
  query(query: MemoryQuery): Promise<MemoryDocument[]>;
  delete(path: string): Promise<void>;
}
```

```typescript
await ctx.memory.write("vision.md", "# Vision\n\n...");
const doc = await ctx.memory.read("vision.md");

const matches = await ctx.memory.query({
  path: "reports", // prefix filter
  keyword: "stripe", // substring match, case-insensitive
  limit: 10,
});

await ctx.memory.delete("scratch.md");
```

`FileMemory` writes Markdown files under a root directory (conventionally `.business/`) and reads them back with filesystem mtimes for `updatedAt`. `query()` walks the tree, so nested paths like `reports/q1.md` work out of the box.

## On-disk layout

```
.business/
  roadmap.md
  vision.md
  reports/
    q1.md
    q2.md
```

This is intentionally readable outside the framework — `cat .business/vision.md` just works, and the whole directory can be committed to git if a project wants human-reviewable history of its own memory.

## SQLite: currently used for artifact metadata, not general memory

As of v0.1.0-alpha, the `Memory` interface (`FileMemory`) is Markdown-only — `query()` does a keyword/path scan over files, not an indexed SQL query. The `SqliteStore` primitive in `packages/memory` exists and is built (schema: `records(id, collection, data, updatedAt)`), but no `Memory` implementation currently uses it — general-purpose structured memory is not yet wired to SQLite.

Where SQLite **is** in active use today is artifact metadata (see [`artifacts.md`](./artifacts.md)) — versions, parent/child chains, and relationship graphs are all queried through `artifact-sqlite`, not through the `Memory` interface. If your agent needs structured, queryable state (not just documents), model it as an artifact rather than reaching for `SqliteStore` directly.

## The relationship graph

Structured relationships between records — e.g. "this Strategy generated this PRD" — are modeled as **artifact relationships**, not as general memory. See [`artifacts.md#relationships`](./artifacts.md) for the graph model. This was a deliberate choice: relationships are almost always between artifacts (versioned, attributable outputs), so keeping the graph inside `artifact-sqlite` avoids needing to reconcile two separate relationship systems.

## Future: vector store

The long-term plan (per the original roadmap) is:

```
Documents
  ↓
Structured Data
  ↓
Embeddings
  ↓
Knowledge Graph
```

Because `Memory` is an interface, adding semantic search later means writing a new implementation (or a decorator around `FileMemory`) that also writes embeddings on `write()` and does similarity search inside `query()` — no redesign of the interface itself, and no changes required in any agent that already uses `ctx.memory`.

## Guidance for agent authors

- Use `ctx.memory` for scratch notes, research findings, and working context an agent wants to persist across runs.
- Use `ctx.artifacts` for anything that is itself a deliverable — a report, a PRD, a plan — especially if another agent will read it or it needs a version history.
- Don't build ad-hoc query logic against `ctx.memory.query()` for anything relationship-heavy; model it as artifacts instead.
