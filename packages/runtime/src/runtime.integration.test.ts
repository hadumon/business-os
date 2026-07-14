import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { defineAgent } from "@business-os/sdk";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "./runtime.js";

describe("Runtime — full integration flow", () => {
  let rootDir: string;
  let runtime: Runtime;
  let memory: FileMemory;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-runtime-"));
    memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true });
  });

  it("runs Discover → Strategy → Product, producing linked artifacts and memory updates", async () => {
    const discover = defineAgent({
      id: "discover",
      inputSchema: z.object({ topic: z.string() }),
      execute: async (ctx) => {
        await ctx.memory.write("discover-notes.md", `Discovered: ${ctx.input.topic}`);
        return { findings: `insight about ${ctx.input.topic}` };
      },
    });

    const strategy = defineAgent({
      id: "strategy",
      inputSchema: z.object({ findings: z.string() }),
      execute: async (ctx) => {
        const artifact = await ctx.artifacts.create({
          project: "demo",
          type: "strategy",
          title: "Strategy Report",
          content: `# Strategy\n\nBased on: ${ctx.input.findings}`,
          author: "agent:strategy",
        });
        return { strategyArtifactId: artifact.metadata.id };
      },
    });

    const product = defineAgent({
      id: "product",
      inputSchema: z.object({ strategyArtifactId: z.string() }),
      execute: async (ctx) => {
        const prd = await ctx.artifacts.create({
          project: "demo",
          type: "prd",
          title: "PRD",
          content: "# PRD\n\nDerived from strategy",
          author: "agent:product",
        });
        await ctx.artifacts.linkRelationship(
          ctx.input.strategyArtifactId,
          prd.metadata.id,
          "generated",
        );
        return { prdArtifactId: prd.metadata.id };
      },
    });

    runtime.register(discover);
    runtime.register(strategy);
    runtime.register(product);

    const discoverResult = await runtime.execute("discover", { topic: "market gap" });
    expect(discoverResult.success).toBe(true);
    const findings = (discoverResult.output as { findings: string }).findings;

    const strategyResult = await runtime.execute("strategy", { findings });
    expect(strategyResult.success).toBe(true);
    const strategyArtifactId = (strategyResult.output as { strategyArtifactId: string })
      .strategyArtifactId;

    const productResult = await runtime.execute("product", { strategyArtifactId });
    expect(productResult.success).toBe(true);
    const prdArtifactId = (productResult.output as { prdArtifactId: string }).prdArtifactId;

    // Artifact created
    const prd = await artifacts.get(prdArtifactId);
    expect(prd).not.toBeNull();
    expect(prd!.content).toContain("Derived from strategy");

    // Memory updated
    const notes = await memory.read("discover-notes.md");
    expect(notes!.content).toContain("market gap");

    // Relationship graph updated
    const rels = await artifacts.getRelationships(strategyArtifactId);
    expect(rels.length).toBe(1);
    expect(rels[0]!.relation).toBe("generated");
    expect(rels[0]!.targetArtifactId).toBe(prdArtifactId);
  });

  it("supports cancellation mid-flow", async () => {
    const agent = defineAgent({
      id: "long-task",
      execute: async () => ({ done: true }),
    });
    runtime.register(agent);
    runtime.cancel();

    const result = await runtime.execute("long-task", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("cancelled");
  });

  it("retries on failure per configured retry policy", async () => {
    let attempts = 0;
    const flaky = defineAgent({
      id: "flaky",
      execute: async () => {
        attempts++;
        if (attempts < 3) throw new Error("transient");
        return { ok: true };
      },
    });

    const retryingRuntime = new Runtime({
      dependencies: { memory, artifacts },
      retry: { maxAttempts: 3, backoffMs: 0 },
    });
    retryingRuntime.register(flaky);

    const result = await retryingRuntime.execute("flaky", {});
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
});
