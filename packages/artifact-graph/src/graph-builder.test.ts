import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { GraphBuilder } from "./graph-builder.js";

describe("GraphBuilder", () => {
    let rootDir: string;
    let artifacts: SqliteArtifactManager;
    let builder: GraphBuilder;

    beforeEach(async () => {
        rootDir = await mkdtemp(join(tmpdir(), "business-os-graph-"));
        artifacts = new SqliteArtifactManager({ rootDir });
        builder = new GraphBuilder(artifacts);
    });

    afterEach(async () => {
        artifacts.close();
        await rm(rootDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it("builds a graph with nodes and edges for a linear chain", async () => {
        const discover = await artifacts.create({ project: "acme", type: "report", title: "Discover", content: "x", author: "a" });
        const strategy = await artifacts.create({ project: "acme", type: "strategy", title: "Strategy", content: "x", author: "a" });
        const prd = await artifacts.create({ project: "acme", type: "prd", title: "PRD", content: "x", author: "a" });

        await artifacts.linkRelationship(discover.metadata.id, strategy.metadata.id, "generated");
        await artifacts.linkRelationship(strategy.metadata.id, prd.metadata.id, "generated");

        const graph = await builder.build({ project: "acme" });

        expect(graph.nodes.length).toBe(3);
        expect(graph.edges.length).toBe(2);
        expect(graph.edges).toContainEqual({ from: discover.metadata.id, to: strategy.metadata.id, relation: "generated" });
    });

    it("excludes edges to artifacts outside the filter scope", async () => {
        const a = await artifacts.create({ project: "alpha", type: "report", title: "A", content: "x", author: "a" });
        const b = await artifacts.create({ project: "beta", type: "strategy", title: "B", content: "x", author: "a" });
        await artifacts.linkRelationship(a.metadata.id, b.metadata.id, "generated");

        const graph = await builder.build({ project: "alpha" });

        expect(graph.nodes.length).toBe(1);
        expect(graph.edges.length).toBe(0); // b is out of scope, so the edge is dropped
    });

    it("buildFromArtifact expands outward from a single node", async () => {
        const discover = await artifacts.create({ project: "acme", type: "report", title: "Discover", content: "x", author: "a" });
        const strategy = await artifacts.create({ project: "acme", type: "strategy", title: "Strategy", content: "x", author: "a" });
        const prd = await artifacts.create({ project: "acme", type: "prd", title: "PRD", content: "x", author: "a" });
        await artifacts.linkRelationship(discover.metadata.id, strategy.metadata.id, "generated");
        await artifacts.linkRelationship(strategy.metadata.id, prd.metadata.id, "generated");

        const graph = await builder.buildFromArtifact(discover.metadata.id);

        expect(graph.nodes.map((n) => n.id).sort()).toEqual(
            [discover.metadata.id, strategy.metadata.id, prd.metadata.id].sort()
        );
    });

    it("buildFromArtifact respects depth limit", async () => {
        const discover = await artifacts.create({ project: "acme", type: "report", title: "Discover", content: "x", author: "a" });
        const strategy = await artifacts.create({ project: "acme", type: "strategy", title: "Strategy", content: "x", author: "a" });
        const prd = await artifacts.create({ project: "acme", type: "prd", title: "PRD", content: "x", author: "a" });
        await artifacts.linkRelationship(discover.metadata.id, strategy.metadata.id, "generated");
        await artifacts.linkRelationship(strategy.metadata.id, prd.metadata.id, "generated");

        const graph = await builder.buildFromArtifact(discover.metadata.id, 1);

        const ids = graph.nodes.map((n) => n.id);
        expect(ids).toContain(discover.metadata.id);
        expect(ids).toContain(strategy.metadata.id);
        expect(ids).not.toContain(prd.metadata.id);
    });

    it("supports fan-out (one artifact generating multiple downstream artifacts)", async () => {
        const prd = await artifacts.create({ project: "acme", type: "prd", title: "PRD", content: "x", author: "a" });
        const roadmap = await artifacts.create({ project: "acme", type: "roadmap", title: "Roadmap", content: "x", author: "a" });
        const sprint = await artifacts.create({ project: "acme", type: "sprint", title: "Sprint", content: "x", author: "a" });
        await artifacts.linkRelationship(prd.metadata.id, roadmap.metadata.id, "generated");
        await artifacts.linkRelationship(prd.metadata.id, sprint.metadata.id, "generated");

        const graph = await builder.build({ project: "acme" });
        const fromPrd = graph.edges.filter((e) => e.from === prd.metadata.id);

        expect(fromPrd.length).toBe(2);
    });
});