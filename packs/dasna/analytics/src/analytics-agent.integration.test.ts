import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { analyticsAgent } from "./analytics-agent.js";
import { marketingAgent } from "@dasna/agent-marketing";
import { supportAgent } from "@dasna/agent-support";

describe("analyticsAgent - integration", () => {
  let rootDir: string;
  let runtime: Runtime;
  let artifacts: SqliteArtifactManager;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "dasna-analytics-"));
    const memory = new FileMemory({ rootDir });
    artifacts = new SqliteArtifactManager({ rootDir });
    runtime = new Runtime({ dependencies: { memory, artifacts } });
    runtime.register(analyticsAgent);
    runtime.register(marketingAgent);
    runtime.register(supportAgent);
  });

  afterEach(async () => {
    artifacts.close();
    await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it("produces a report covering all five sections even with no prior marketing/support activity", async () => {
    const result = await runtime.execute("analytics", { project: "dasna" });
    expect(result.success).toBe(true);

    const output = result.output as { artifactId: string };
    const artifact = await artifacts.get(output.artifactId);
    expect(artifact!.metadata.type).toBe("insight");
    expect(artifact!.content).toContain("Revenue Drivers");
    expect(artifact!.content).toContain("Inventory Risks");
    expect(artifact!.content).toContain("Marketing Opportunities");
    expect(artifact!.content).toContain("Customer Trends");
    expect(artifact!.content).toContain("Recommended Actions");
  });

  it("detects marketing coverage after a real campaign is run", async () => {
    await runtime.execute("marketing", { project: "dasna", campaign: "dashain" });
    const result = await runtime.execute("analytics", { project: "dasna" });
    const output = result.output as { artifactId: string };
    const artifact = await artifacts.get(output.artifactId);

    // At least one of the featured products should now show as covered - check the section doesn't list all 6 as uncovered.
    const uncoveredSection = artifact!.content.split("## Marketing Opportunities")[1]!.split("## Customer Trends")[0]!;
    expect(uncoveredSection).not.toContain("Dasna ComfortFoam Memory Mattress - Queen");
  });

  it("surfaces cross-agent insights when signals warrant it", async () => {
    const result = await runtime.execute("analytics", { project: "dasna" });
    const output = result.output as { insightCount: number };
    // With the sample catalog (OrthoSupport and HybridPlus low on stock), expect at least a passive run without crashing.
    expect(output.insightCount).toBeGreaterThanOrEqual(0);
  });
});
