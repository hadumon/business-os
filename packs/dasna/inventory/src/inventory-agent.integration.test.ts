import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { inventoryAgent } from "./inventory-agent.js";

describe("inventoryAgent - integration", () => {
  let rootDir: string;
  let runtime: Runtime;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "dasna-inventory-"));
    const memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
    runtime.register(inventoryAgent);
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it("produces an inventory report covering all three questions", async () => {
    const result = await runtime.execute("inventory", { project: "dasna" });
    expect(result.success).toBe(true);

    const output = result.output as { artifactId: string; criticalCount: number; reorderNowCount: number };
    const artifact = await artifacts.get(output.artifactId);

    expect(artifact!.content).toContain("Stock Health");
    expect(artifact!.content).toContain("Fastest-Moving Products");
    expect(artifact!.content).toContain("Reorder Recommendations");
  });

  it("flags the hybrid king as needing attention given its thin stock", async () => {
    const result = await runtime.execute("inventory", { project: "dasna" });
    const output = result.output as { artifactId: string };
    const artifact = await artifacts.get(output.artifactId);
    expect(artifact!.content).toContain("Dasna HybridPlus Mattress - King");
  });
});
