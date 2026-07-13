import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "./memory.js";

describe("FileMemory", () => {
  let rootDir: string;
  let memory: FileMemory;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-memory-"));
    memory = new FileMemory({ rootDir });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("writes and reads a markdown document", async () => {
    await memory.write("roadmap.md", "# Roadmap\n\nPhase 1");
    const doc = await memory.read("roadmap.md");

    expect(doc).not.toBeNull();
    expect(doc!.content).toContain("Phase 1");
  });

  it("returns null for a document that doesn't exist", async () => {
    const doc = await memory.read("missing.md");
    expect(doc).toBeNull();
  });

  it("deletes a document", async () => {
    await memory.write("temp.md", "temporary");
    await memory.delete("temp.md");
    const doc = await memory.read("temp.md");
    expect(doc).toBeNull();
  });

  it("queries documents by keyword across nested paths", async () => {
    await memory.write("vision.md", "We want to build the best product.");
    await memory.write("reports/q1.md", "Q1 revenue grew significantly.");
    await memory.write("reports/q2.md", "Q2 was a slow product quarter.");

    const results = await memory.query({ keyword: "product" });

    expect(results.length).toBe(2);
    expect(results.map((d) => d.path).sort()).toEqual(["reports/q2.md", "vision.md"]);
  });

  it("filters query results by path prefix", async () => {
    await memory.write("vision.md", "top level doc");
    await memory.write("reports/q1.md", "nested doc");

    const results = await memory.query({ path: "reports" });

    expect(results.length).toBe(1);
    expect(results[0]!.path).toBe("reports/q1.md");
  });
});
