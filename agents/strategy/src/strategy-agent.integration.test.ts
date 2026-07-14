import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { strategyAgent } from "./strategy-agent.js";
import { discoverAgent } from "@business-os/agent-discover";

describe("strategyAgent — full integration", () => {
  let rootDir: string;
  let runtime: Runtime;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-strategy-"));
    const memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
    runtime.register(discoverAgent);
    runtime.register(strategyAgent);
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it("produces a Strategy artifact composed from capabilities", async () => {
    const result = await runtime.execute("strategy", {
      project: "acme",
      topic: "ai meeting notes",
    });

    expect(result.success).toBe(true);
    const output = result.output as { artifactId: string; opportunityScore: number };

    const artifact = await artifacts.get(output.artifactId);
    expect(artifact!.content).toContain("Strategy Report: ai meeting notes");
    expect(artifact!.content).toContain("SWOT");
    expect(artifact!.metadata.type).toBe("strategy");
  });

  it("links to a source Discover artifact when provided", async () => {
    const discoverResult = await runtime.execute("discover", {
      project: "acme",
      topic: "b2b saas",
    });
    const discoverOutput = discoverResult.output as { artifactId: string };

    const strategyResult = await runtime.execute("strategy", {
      project: "acme",
      topic: "b2b saas",
      sourceArtifactId: discoverOutput.artifactId,
    });
    const strategyOutput = strategyResult.output as { artifactId: string };

    const rels = await artifacts.getRelationships(discoverOutput.artifactId);
    expect(rels.length).toBe(1);
    expect(rels[0]!.relation).toBe("generated");
    expect(rels[0]!.targetArtifactId).toBe(strategyOutput.artifactId);
  });
});
