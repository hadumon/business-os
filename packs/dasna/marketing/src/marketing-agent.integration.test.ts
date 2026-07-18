import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { marketingAgent } from "./marketing-agent.js";

describe("marketingAgent - integration", () => {
    let rootDir: string;
    let runtime: Runtime;
    let artifacts: SqliteArtifactManager;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), "dasna-marketing-"));
        const memory = new FileMemory({ rootDir });
        artifacts = new SqliteArtifactManager({ rootDir });
        runtime = new Runtime({ dependencies: { memory, artifacts } });
        runtime.register(marketingAgent);
    });

    afterEach(async () => {
        artifacts.close();
        await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it("produces a campaign brief artifact with general and product captions", async () => {
        const result = await runtime.execute("marketing", { project: "dasna", campaign: "dashain" });
        expect(result.success).toBe(true);

        const output = result.output as { artifactId: string; captionCount: number };
        expect(output.captionCount).toBeGreaterThan(0);

        const artifact = await artifacts.get(output.artifactId);
        expect(artifact!.content).toContain("Dashain Festival");
        expect(artifact!.content).toContain("General Posts");
        expect(artifact!.content).toContain("Product Posts");
        expect(artifact!.metadata.type).toBe("marketing");
    });

    it("respects explicit featuredProductIds", async () => {
        const result = await runtime.execute("marketing", {
            project: "dasna",
            campaign: "tihar",
            featuredProductIds: ["mat-hybrid-king"],
        });
        const output = result.output as { artifactId: string };
        const artifact = await artifacts.get(output.artifactId);
        expect(artifact!.content).toContain("HybridPlus");
    });

    it("fails clearly for an unknown campaign", async () => {
        const result = await runtime.execute("marketing", { project: "dasna", campaign: "halloween" });
        expect(result.success).toBe(false);
        expect(result.error).toContain("Unknown campaign");
    });
});