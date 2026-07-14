import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteArtifactManager } from "./sqlite-artifact-manager.js";

describe("SqliteArtifactManager", () => {
  let rootDir: string;
  let manager: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-artifacts-"));
    manager = new SqliteArtifactManager({ rootDir });
  });

  afterEach(async () => {
    manager.close();
    await rm(rootDir, { recursive: true, force: true });
  });

  it("creates an artifact with version 1", async () => {
    const artifact = await manager.create({
      project: "demo",
      type: "prd",
      title: "Initial PRD",
      content: "# PRD\n\nOverview",
      author: "agent:strategy",
    });

    expect(artifact.metadata.version).toBe(1);
    expect(artifact.metadata.parentVersion).toBeNull();
    expect(artifact.content).toContain("Overview");
  });

  it("retrieves the latest version", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "v1 content",
      author: "agent:strategy",
    });
    await manager.update(created.metadata.id, { content: "v2 content", author: "agent:strategy" });

    const latest = await manager.latest(created.metadata.id);
    expect(latest!.metadata.version).toBe(2);
    expect(latest!.content).toBe("v2 content");
  });

  it("retrieves full version history", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "v1",
      author: "a",
    });
    await manager.update(created.metadata.id, { content: "v2", author: "a" });
    await manager.update(created.metadata.id, { content: "v3", author: "a" });

    const history = await manager.versions(created.metadata.id);
    expect(history.map((v) => v.version)).toEqual([1, 2, 3]);
  });

  it("never overwrites — update always creates a new version", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "original",
      author: "a",
    });
    await manager.update(created.metadata.id, { content: "changed", author: "a" });

    const v1 = await manager.get(created.metadata.id, 1);
    const v2 = await manager.get(created.metadata.id, 2);

    expect(v1!.content).toBe("original");
    expect(v2!.content).toBe("changed");
  });

  it("lists artifacts filtered by type", async () => {
    await manager.create({ project: "demo", type: "prd", title: "P1", content: "x", author: "a" });
    await manager.create({
      project: "demo",
      type: "strategy",
      title: "S1",
      content: "x",
      author: "a",
    });

    const prds = await manager.list({ type: "prd" });
    expect(prds.length).toBe(1);
    expect(prds[0]!.type).toBe("prd");
  });

  it("lists artifacts filtered by project", async () => {
    await manager.create({ project: "alpha", type: "prd", title: "P1", content: "x", author: "a" });
    await manager.create({ project: "beta", type: "prd", title: "P2", content: "x", author: "a" });

    const alphaOnly = await manager.list({ project: "alpha" });
    expect(alphaOnly.length).toBe(1);
    expect(alphaOnly[0]!.project).toBe("alpha");
  });

  it("persists metadata correctly (title, tags, status)", async () => {
    const created = await manager.create({
      project: "demo",
      type: "roadmap",
      title: "Q3 Roadmap",
      content: "x",
      author: "a",
      tags: ["q3", "growth"],
      status: "review",
    });

    const fetched = await manager.get(created.metadata.id);
    expect(fetched!.metadata.title).toBe("Q3 Roadmap");
    expect(fetched!.metadata.tags).toEqual(["q3", "growth"]);
    expect(fetched!.metadata.status).toBe("review");
  });

  it("writes the markdown file at the expected path", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "hello",
      author: "a",
    });

    expect(created.metadata.path).toContain(created.metadata.type);
    expect(created.metadata.path).toContain(created.metadata.id);
    expect(created.metadata.path).toContain("v1.md");
  });

  it("maintains parent/child version chain", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "v1",
      author: "a",
    });
    const v2 = await manager.update(created.metadata.id, { content: "v2", author: "a" });
    const v3 = await manager.update(created.metadata.id, { content: "v3", author: "a" });

    expect(v2.metadata.parentVersion).toBe(1);
    expect(v3.metadata.parentVersion).toBe(2);
  });

  it("links relationships between artifacts (e.g. strategy generated PRD)", async () => {
    const strategy = await manager.create({
      project: "demo",
      type: "strategy",
      title: "Strategy",
      content: "x",
      author: "a",
    });
    const prd = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "x",
      author: "a",
    });

    await manager.linkRelationship(strategy.metadata.id, prd.metadata.id, "generated");

    const rels = await manager.getRelationships(strategy.metadata.id);
    expect(rels.length).toBe(1);
    expect(rels[0]!.relation).toBe("generated");
    expect(rels[0]!.targetArtifactId).toBe(prd.metadata.id);
  });

  it("deletes an artifact and all its versions", async () => {
    const created = await manager.create({
      project: "demo",
      type: "prd",
      title: "PRD",
      content: "x",
      author: "a",
    });
    await manager.update(created.metadata.id, { content: "y", author: "a" });

    await manager.delete(created.metadata.id);

    const result = await manager.get(created.metadata.id);
    expect(result).toBeNull();
  });

  it("generates unique ids for concurrent artifact creation", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        manager.create({
          project: "demo",
          type: "prd",
          title: `PRD ${i}`,
          content: "x",
          author: "a",
        }),
      ),
    );

    const ids = results.map((r) => r.metadata.id);
    expect(new Set(ids).size).toBe(20);
  });
});
