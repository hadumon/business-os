import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { discoverAgent } from "@business-os/agent-discover";
import { strategyAgent } from "@business-os/agent-strategy";
import { productAgent } from "./product-agent.js";

describe("productAgent — full integration", () => {
  let rootDir: string;
  let runtime: Runtime;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-product-"));
    const memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
    runtime.register(discoverAgent);
    runtime.register(strategyAgent);
    runtime.register(productAgent);
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it("derives a PRD from a Strategy artifact and links the relationship", async () => {
    const strategyResult = await runtime.execute("strategy", {
      project: "acme",
      topic: "ai meeting notes",
    });
    const strategyOutput = strategyResult.output as { artifactId: string };

    const productResult = await runtime.execute("product", {
      project: "acme",
      strategyArtifactId: strategyOutput.artifactId,
    });

    expect(productResult.success).toBe(true);
    const productOutput = productResult.output as { artifactId: string };

    const prd = await artifacts.get(productOutput.artifactId);
    expect(prd!.metadata.type).toBe("prd");
    expect(prd!.content).toContain("Product Requirements Document: ai meeting notes");
    expect(prd!.content).toContain("Problem Statement");

    const rels = await artifacts.getRelationships(strategyOutput.artifactId);
    expect(rels.length).toBe(1);
    expect(rels[0]!.relation).toBe("generated");
    expect(rels[0]!.targetArtifactId).toBe(productOutput.artifactId);
  });

  it("runs the full Discover → Strategy → Product chain", async () => {
    const discoverResult = await runtime.execute("discover", {
      project: "acme",
      topic: "dev tools",
    });
    const discoverOutput = discoverResult.output as { artifactId: string };

    const strategyResult = await runtime.execute("strategy", {
      project: "acme",
      topic: "dev tools",
      sourceArtifactId: discoverOutput.artifactId,
    });
    const strategyOutput = strategyResult.output as { artifactId: string };

    const productResult = await runtime.execute("product", {
      project: "acme",
      strategyArtifactId: strategyOutput.artifactId,
    });
    const productOutput = productResult.output as { artifactId: string };

    // Full chain: Discover -> Strategy -> Product, each linked
    const discoverRels = await artifacts.getRelationships(discoverOutput.artifactId);
    expect(discoverRels[0]!.targetArtifactId).toBe(strategyOutput.artifactId);

    const strategyRels = await artifacts.getRelationships(strategyOutput.artifactId);
    const generatedRel = strategyRels.find((r) => r.sourceArtifactId === strategyOutput.artifactId);
    expect(generatedRel!.targetArtifactId).toBe(productOutput.artifactId);
  });

  it("records provenance linking the PRD back to its source strategy artifact", async () => {
    const strategyResult = await runtime.execute("strategy", { project: "acme", topic: "provenance test" });
    const strategyOutput = strategyResult.output as { artifactId: string };

    const productResult = await runtime.execute("product", {
      project: "acme",
      strategyArtifactId: strategyOutput.artifactId,
    });
    const productOutput = productResult.output as { artifactId: string };

    const prd = await artifacts.get(productOutput.artifactId);
    expect(prd!.metadata.provenance?.generatedBy.agentId).toBe("product");
    expect(prd!.metadata.provenance?.inputArtifactIds).toEqual([strategyOutput.artifactId]);
  });

  it("rejects a strategyArtifactId that doesn't exist", async () => {
    const result = await runtime.execute("product", {
      project: "acme",
      strategyArtifactId: "strategy-does-not-exist",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("rejects an artifact id that isn't a strategy artifact", async () => {
    const discoverResult = await runtime.execute("discover", {
      project: "acme",
      topic: "wrong type test",
    });
    const discoverOutput = discoverResult.output as { artifactId: string };

    const result = await runtime.execute("product", {
      project: "acme",
      strategyArtifactId: discoverOutput.artifactId, // a "report", not a "strategy"
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("expected");
  });
});
