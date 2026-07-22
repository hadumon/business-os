import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { Pipeline, SimpleEventEmitter } from "@business-os/workflow";
import { catalogAgent } from "@dasna/agent-catalog";
import { inventoryAgent } from "@dasna/agent-inventory";
import { analyticsAgent } from "@dasna/agent-analytics";
import { operationsPipeline } from "./pipelines.js";

describe("Dasna Operations Pipeline — Integration", () => {
  let tmpDir: string;
  let runtime: Runtime;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "dasna-pipeline-test-"));
    const memory = new FileMemory({ rootDir: join(tmpDir, "memory") });
    artifacts = new SqliteArtifactManager({ rootDir: tmpDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });

    runtime.register(catalogAgent);
    runtime.register(inventoryAgent);
    runtime.register(analyticsAgent);
  });

  afterEach(async () => {
    await artifacts.close();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("runs the operations pipeline end-to-end (catalog -> inventory -> analytics)", async () => {
    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(operationsPipeline, events);

    const result = await pipeline.run(runtime, { project: "dasna-test" });

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(["catalog", "inventory", "analytics"]);
    expect(result.artifacts["catalog"]).toBeDefined();
    expect(result.artifacts["inventory"]).toBeDefined();
    expect(result.artifacts["analytics"]).toBeDefined();

    // Verify artifacts stored in database
    const createdArtifacts = await artifacts.list({ project: "dasna-test" });
    expect(createdArtifacts.length).toBeGreaterThanOrEqual(3);
  });
});
