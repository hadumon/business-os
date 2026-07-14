# Artifacts

Artifacts are BusinessOS's first-class model for anything an agent produces that's meant to be reviewed, referenced, or built upon — strategy reports, PRDs, roadmaps, sprint plans, marketing plans, investor memos. The Artifact Manager is, deliberately, "the Git of BusinessOS": nothing is ever overwritten, everything is versioned, and every artifact can know what produced it and what it produced in turn.

## Core principle: immutable, versioned, never overwritten

There is no `overwrite()` method. `update()` always creates a new version:

```
PRD v1 → PRD v2 → PRD v3
```

Each version is linked to its parent via `parentVersion`. This gives every artifact a full, inspectable history — you can always answer "what did the PRD say before this change?"

```typescript
const created = await ctx.artifacts.create({
  project: "acme",
  type: "prd",
  title: "Checkout Redesign PRD",
  content: "# PRD\n\n## Overview\n...",
  author: "agent:product",
});
// created.metadata.version === 1, parentVersion === null

const updated = await ctx.artifacts.update(created.metadata.id, {
  content: "# PRD\n\n## Overview (revised)\n...",
  author: "agent:product",
});
// updated.metadata.version === 2, parentVersion === 1
```

## Why never overwrite

Multi-agent collaboration means several agents may touch the same artifact over its lifetime — Strategy drafts it, Product refines it, Quality annotates it. If any of them could silently overwrite content, there'd be no way to know what changed, when, or by whom. Immutable versions turn every edit into an auditable event instead of a destructive write.

## The `ArtifactManager` interface

Defined in `artifact-core`, implemented by `SqliteArtifactManager` in `packages/artifacts`:

```typescript
interface ArtifactManager {
  create(input: CreateArtifactInput): Promise<Artifact>;
  update(id: string, input: UpdateArtifactInput): Promise<Artifact>;
  get(id: string, version?: number): Promise<Artifact | null>;
  latest(id: string): Promise<Artifact | null>;
  versions(id: string): Promise<ArtifactMetadata[]>;
  list(filter?: ArtifactFilter): Promise<ArtifactMetadata[]>;
  delete(id: string): Promise<void>;

  linkRelationship(
    sourceArtifactId: string,
    targetArtifactId: string,
    relation: RelationType,
  ): Promise<ArtifactRelationship>;
  getRelationships(artifactId: string): Promise<ArtifactRelationship[]>;
}
```

## Storage split: content vs. metadata

Content and metadata are deliberately stored in different systems, mirroring the [Memory](./memory.md) philosophy:

```
Markdown (artifact-files)     → the actual content, clean, no frontmatter
SQLite (artifact-sqlite)      → id, project, type, title, version, parentVersion,
                                  status, author, tags, path, relationships
```

Markdown files stay clean on purpose — no embedded metadata — so they render correctly anywhere and stay diffable:

```markdown
# Product Requirements Document

## Overview

...

## Goals

...
```

On-disk layout:

```
.business/
  artifacts/
    prd/
      prd-a1b2c3d4/
        v1.md
        v2.md
    strategy/
      strategy-9f8e7d6c/
        v1.md
  state/
    artifacts.sqlite
```

SQLite is the **source of truth for metadata** — never parse frontmatter out of the Markdown to answer "what version is this" or "who authored this." Query the metadata store instead.

## Metadata fields

| Field                     | Meaning                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | Stable across all versions of one artifact (e.g. `prd-a1b2c3d4`)                                                                                              |
| `project`                 | Which project/workspace this belongs to                                                                                                                       |
| `type`                    | `strategy \| prd \| roadmap \| sprint \| marketing \| investor \| report \| unknown` — extensible, not a hardcoded enum consumers must exhaustively switch on |
| `title`                   | Human-readable title                                                                                                                                          |
| `createdAt` / `updatedAt` | Timestamps                                                                                                                                                    |
| `version`                 | Monotonically increasing per artifact `id`                                                                                                                    |
| `parentVersion`           | The version this one was derived from, or `null` for v1                                                                                                       |
| `status`                  | `draft \| review \| approved \| archived`                                                                                                                     |
| `author`                  | Free-form string, conventionally `agent:<id>` or a human identifier                                                                                           |
| `tags`                    | Array of strings, filterable via `list({ tag })`                                                                                                              |
| `path`                    | Resolved Markdown file path for this specific version                                                                                                         |

## Relationships

Artifacts aren't isolated documents — they form a graph describing what produced what:

```
Strategy
   │ generated
   ▼
  PRD
   │ generated
   ▼
Architecture
   │ generated
   ▼
 Sprint
```

```typescript
await ctx.artifacts.linkRelationship(strategyId, prdId, "generated");

const rels = await ctx.artifacts.getRelationships(strategyId);
// [{ sourceArtifactId: strategyId, targetArtifactId: prdId, relation: "generated", ... }]
```

Supported relation types: `generated`, `references`, `supersedes`. This is what lets a future UI or agent answer "show me everything downstream of this Strategy doc" without any agent having to maintain that index manually.

## Lifecycle status

```
draft → review → approved → archived
```

`status` is set on `create()` (defaults to `draft`) and can be changed on `update()`. This is metadata only — the framework doesn't enforce transition rules (e.g. nothing stops you going straight from `draft` to `archived`); agents and business-pack conventions decide what transitions mean.

## Querying and filtering

```typescript
const prds = await ctx.artifacts.list({ type: "prd" });
const acmeDocs = await ctx.artifacts.list({ project: "acme" });
const approved = await ctx.artifacts.list({ status: "approved" });
const stripeRelated = await ctx.artifacts.list({ keyword: "stripe" });
```

`list()` always returns each artifact's **latest** version only — use `versions(id)` to get the full history of one specific artifact.

```typescript
const history = await ctx.artifacts.versions(prdId);
// [{ version: 1, ... }, { version: 2, ... }, { version: 3, ... }]
```

## Concurrency

Artifact IDs are generated with `crypto.randomUUID()` (truncated), not sequential counters, specifically so concurrent `create()` calls from multiple agents never collide. This is covered by a dedicated test (`generates unique ids for concurrent artifact creation`) in the artifact test suite.

## Future: assets beyond Markdown

The per-artifact directory layout (`{type}/{id}/v{n}.md`) is deliberately structured so that non-Markdown assets — diagrams, screenshots, generated images, spreadsheets, PDFs — can be added alongside content later without a redesign. As of v0.1.0-alpha only Markdown content is implemented.

## Future: semantic search

Same story as [Memory](./memory.md#future-vector-store): because metadata already lives in SQLite with indexes, adding an embeddings column and vector search later is additive, not a migration.
