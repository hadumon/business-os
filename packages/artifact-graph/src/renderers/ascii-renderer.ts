import type { ArtifactGraph, GraphNode } from "../types.js";

function nodeLabel(node: GraphNode): string {
    return `${node.title} (${node.id})`;
}

export function renderAscii(graph: ArtifactGraph, options: { showRelationLabels?: boolean } = {}): string {
    if (graph.nodes.length === 0) return "No artifacts found.";

    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    const childrenOf = new Map<string, ArtifactGraph["edges"]>();
    const hasIncoming = new Set<string>();

    for (const edge of graph.edges) {
        if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, []);
        childrenOf.get(edge.from)!.push(edge);
        hasIncoming.add(edge.to);
    }

    const roots = graph.nodes.filter((n) => !hasIncoming.has(n.id));
    const visited = new Set<string>();
    const lines: string[] = [];

    function renderNode(node: GraphNode, prefix: string, isLast: boolean, isRoot: boolean): void {
        if (visited.has(node.id)) {
            lines.push(`${prefix}${isLast ? "└── " : "├── "}${nodeLabel(node)} (already shown above)`);
            return;
        }
        visited.add(node.id);

        if (isRoot) {
            lines.push(nodeLabel(node));
        }

        const edges = childrenOf.get(node.id) ?? [];
        edges.forEach((edge, i) => {
            const child = nodesById.get(edge.to);
            if (!child) return;
            const last = i === edges.length - 1;
            const branch = last ? "└──" : "├──";
            const relationLine = options.showRelationLabels
                ? `${prefix}${branch} ${edge.relation}`
                : null;
            if (relationLine) lines.push(relationLine);
            const childPrefix = prefix + (last ? "    " : "│   ");
            const connector = options.showRelationLabels ? "▶ " : `${branch} `;
            lines.push(`${prefix}${options.showRelationLabels ? "    " : ""}${connector}${nodeLabel(child)}`);
            renderNode(child, childPrefix, last, false);
        });
    }

    for (const root of roots) {
        renderNode(root, "", true, true);
        lines.push("");
    }

    // Any nodes never reached (e.g. isolated artifacts, or cycles missed above) — list them explicitly.
    const orphans = graph.nodes.filter((n) => !visited.has(n.id));
    if (orphans.length > 0) {
        lines.push("(unconnected artifacts)");
        for (const o of orphans) lines.push(`  ${nodeLabel(o)}`);
    }

    return lines.join("\n");
}