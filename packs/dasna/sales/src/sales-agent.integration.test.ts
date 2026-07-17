import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { salesAgent } from "./sales-agent.js";

describe("salesAgent — integration", () => {
    let rootDir: string;
    let runtime: Runtime;
    let artifacts: SqliteArtifactManager;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), "dasna-sales-"));
        const memory = new FileMemory({ rootDir });
        artifacts = new SqliteArtifactManager({ rootDir });
        runtime = new Runtime({ dependencies: { memory, artifacts } });
        runtime.register(salesAgent);
    });

    afterEach(async () => {
        artifacts.close();
        await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it("produces a quotation artifact recommending a matching product", async () => {
        const result = await runtime.execute("sales", {
            project: "dasna",
            need: "back pain relief",
            budget: 35000,
            size: "queen",
            customerName: "Ramesh",
        });

        expect(result.success).toBe(true);
        const output = result.output as { artifactId: string; topRecommendation?: string };
        expect(output.topRecommendation).toBeDefined();

        const artifact = await artifacts.get(output.artifactId);
        expect(artifact!.content).toContain("Sales Quotation");
        expect(artifact!.content).toContain("Recommended Products");
    });

    it("handles a need with no strong matches gracefully", async () => {
        const result = await runtime.execute("sales", {
            project: "dasna",
            need: "underwater mattress",
            budget: 100,
        });
        expect(result.success).toBe(true);
    });
});