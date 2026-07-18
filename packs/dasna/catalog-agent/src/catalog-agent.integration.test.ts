import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { catalogAgent } from "./catalog-agent.js";

describe("catalogAgent — integration", () => {
    let rootDir: string;
    let runtime: Runtime;
    let artifacts: SqliteArtifactManager;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), "dasna-catalog-"));
        const memory = new FileMemory({ rootDir });
        artifacts = new SqliteArtifactManager({ rootDir });
        runtime = new Runtime({ dependencies: { memory, artifacts } });
        runtime.register(catalogAgent);
    });

    afterEach(async () => {
        artifacts.close();
        await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it("processes a single product when productId is given", async () => {
        const result = await runtime.execute("catalog", { project: "dasna", productId: "mat-memory-queen" });
        expect(result.success).toBe(true);
        const output = result.output as { artifactIds: string[]; productsProcessed: number };
        expect(output.productsProcessed).toBe(1);
        expect(output.artifactIds.length).toBe(1);

        const artifact = await artifacts.get(output.artifactIds[0]!);
        expect(artifact!.content).toContain("Description");
        expect(artifact!.content).toContain("SEO");
        expect(artifact!.content).toContain("Data Quality");
    });

    it("processes the entire catalog when no productId is given", async () => {
        const result = await runtime.execute("catalog", { project: "dasna" });
        expect(result.success).toBe(true);
        const output = result.output as { productsProcessed: number };
        expect(output.productsProcessed).toBeGreaterThan(1);
    });

    it("fails clearly for an unknown productId", async () => {
        const result = await runtime.execute("catalog", { project: "dasna", productId: "does-not-exist" });
        expect(result.success).toBe(false);
        expect(result.error).toContain("No product found");
    });
});