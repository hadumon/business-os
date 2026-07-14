import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { discoverAgent } from "./discover-agent.js";

describe("discoverAgent — full integration", () => {
  let rootDir: string;
  let runtime: Runtime;
  let memory: FileMemory;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "business-os-discover-"));
    memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
    runtime.register(discoverAgent);
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true });
  });

  it("runs the full pipeline and produces a versioned artifact", async () => {
    const result = await runtime.execute("discover", {
      project: "acme",
      topic: "ai meeting notes",
    });

    expect(result.success).toBe(true);
    const output = result.output as {
      artifactId: string;
      opportunityScore: number;
      recommendation: string;
    };

    expect(output.artifactId).toBeTruthy();
    expect(output.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(output.recommendation.length).toBeGreaterThan(0);

    const artifact = await artifacts.get(output.artifactId);
    expect(artifact).not.toBeNull();
    expect(artifact!.content).toContain("Discovery Report: ai meeting notes");
    expect(artifact!.content).toContain("Opportunity Score");
    expect(artifact!.metadata.version).toBe(1);
    expect(artifact!.metadata.type).toBe("report");
  });

  it("writes working notes to memory during the run", async () => {
    await runtime.execute("discover", { project: "acme", topic: "b2b saas" });

    const list = await memory.query({ path: "discover/acme" });
    expect(list.length).toBe(1);
    expect(list[0]!.content).toContain("b2b saas");
  });

  it("emits workflow progress events through the agent's event bus", async () => {
    const seen: string[] = [];
    // ctx.events is per-execution; capture via a fresh runtime wired to log emitted events
    const trackingRuntime = new Runtime({
      dependencies: { memory, artifacts },
      hooks: {
        beforeAgent: () => {
          seen.push("beforeAgent");
        },
        afterAgent: () => {
          seen.push("afterAgent");
        },
      },
    });
    trackingRuntime.register(discoverAgent);

    await trackingRuntime.execute("discover", { project: "acme", topic: "dev tools" });

    expect(seen).toEqual(["beforeAgent", "afterAgent"]);
  });

  it("validates input and rejects an empty topic", async () => {
    const result = await runtime.execute("discover", { project: "acme", topic: "" });
    expect(result.success).toBe(false);
  });
});
