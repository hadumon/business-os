import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";
import { supportAgent } from "./support-agent.js";

describe("supportAgent - integration", () => {
    let rootDir: string;
    let runtime: Runtime;
    let artifacts: SqliteArtifactManager;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), "dasna-support-"));
        const memory = new FileMemory({ rootDir });
        artifacts = new SqliteArtifactManager({ rootDir });
        runtime = new Runtime({ dependencies: { memory, artifacts } });
        runtime.register(supportAgent);
    });

    afterEach(async () => {
        artifacts.close();
        await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it("produces a reply draft artifact for a warranty question", async () => {
        const result = await runtime.execute("support", {
            project: "dasna",
            question: "What's the warranty on the OrthoSupport mattress?",
        });
        expect(result.success).toBe(true);

        const output = result.output as { artifactId: string; topic: string };
        expect(output.topic).toBe("warranty");

        const artifact = await artifacts.get(output.artifactId);
        expect(artifact!.content).toContain("Drafted Reply");
    });

    it("handles delivery questions", async () => {
        const result = await runtime.execute("support", {
            project: "dasna",
            question: "Do you deliver to Pokhara?",
        });
        const output = result.output as { topic: string };
        expect(output.topic).toBe("delivery");
    });
});