import { describe, it, expect } from "vitest";
import { renderAscii, renderMermaid, renderJson } from "./index.js";
import type { ArtifactGraph } from "../types.js";

const sampleGraph: ArtifactGraph = {
    nodes: [
        { id: "discover-1", type: "report", title: "Discover Report", status: "draft", project: "acme", version: 1 },
        { id: "strategy-1", type: "strategy", title: "Strategy Report", status: "draft", project: "acme", version: 1 },
        { id: "prd-1", type: "prd", title: "PRD", status: "draft", project: "acme", version: 1 },
    ],
    edges: [
        { from: "discover-1", to: "strategy-1", relation: "generated" },
        { from: "strategy-1", to: "prd-1", relation: "generated" },
    ],
};

describe("renderers", () => {
    it("renderAscii produces readable tree output", () => {
        const output = renderAscii(sampleGraph);
        expect(output).toContain("Discover Report (discover-1)");
        expect(output).toContain("Strategy Report (strategy-1)");
        expect(output).toContain("PRD (prd-1)");
    });

    it("renderAscii handles an empty graph", () => {
        expect(renderAscii({ nodes: [], edges: [] })).toBe("No artifacts found.");
    });

    it("renderMermaid produces valid graph TD syntax", () => {
        const output = renderMermaid(sampleGraph);
        expect(output).toContain("graph TD");
        expect(output).toContain('discover_1["Discover Report"]');
        expect(output).toContain("discover_1 -->|generated| strategy_1");
    });

    it("renderJson round-trips node and edge data", () => {
        const output = renderJson(sampleGraph);
        const parsed = JSON.parse(output);
        expect(parsed.nodes.length).toBe(3);
        expect(parsed.edges.length).toBe(2);
    });
});