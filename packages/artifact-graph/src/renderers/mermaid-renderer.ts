import type { ArtifactGraph } from "../types.js";

function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function renderMermaid(graph: ArtifactGraph): string {
    const lines = ["graph TD"];

    for (const node of graph.nodes) {
        lines.push(`  ${sanitizeId(node.id)}["${node.title.replace(/"/g, "'")}"]`);
    }
    for (const edge of graph.edges) {
        lines.push(`  ${sanitizeId(edge.from)} -->|${edge.relation}| ${sanitizeId(edge.to)}`);
    }

    return lines.join("\n");
}