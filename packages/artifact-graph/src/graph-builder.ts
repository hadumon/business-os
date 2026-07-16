import type { ArtifactManager, ArtifactFilter } from "@business-os/artifact-core";
import type { ArtifactGraph, GraphEdge } from "./types.js";
import { metadataToNode } from "./types.js";

export interface ArtifactGraphService {
    build(filter?: ArtifactFilter): Promise<ArtifactGraph>;
    buildFromArtifact(artifactId: string, depth?: number): Promise<ArtifactGraph>;
}

export class GraphBuilder implements ArtifactGraphService {
    constructor(private artifacts: ArtifactManager) { }

    /** Builds the full graph for all artifacts matching the filter (typically a project). */
    async build(filter: ArtifactFilter = {}): Promise<ArtifactGraph> {
        const metas = await this.artifacts.list(filter);
        const nodes = metas.map(metadataToNode);
        const nodeIds = new Set(nodes.map((n) => n.id));

        const edges: GraphEdge[] = [];
        const seenEdgeKeys = new Set<string>();

        for (const meta of metas) {
            const rels = await this.artifacts.getRelationships(meta.id);
            for (const rel of rels) {
                // Only include edges where both endpoints are in scope (avoids dangling
                // edges to artifacts filtered out by `filter`, e.g. a different project).
                if (!nodeIds.has(rel.sourceArtifactId) || !nodeIds.has(rel.targetArtifactId)) continue;
                const key = `${rel.sourceArtifactId}->${rel.targetArtifactId}:${rel.relation}`;
                if (seenEdgeKeys.has(key)) continue; // relationships are stored bidirectionally-queryable, dedupe
                seenEdgeKeys.add(key);
                edges.push({ from: rel.sourceArtifactId, to: rel.targetArtifactId, relation: rel.relation });
            }
        }

        return { nodes, edges };
    }

    /** Builds a subgraph centered on one artifact, expanding outward up to `depth` hops (default: unlimited). */
    async buildFromArtifact(artifactId: string, depth = Infinity): Promise<ArtifactGraph> {
        const visited = new Map<string, number>(); // id -> distance from root
        const edges: GraphEdge[] = [];
        const seenEdgeKeys = new Set<string>();

        const queue: Array<{ id: string; dist: number }> = [{ id: artifactId, dist: 0 }];
        visited.set(artifactId, 0);

        while (queue.length > 0) {
            const { id, dist } = queue.shift()!;
            if (dist >= depth) continue;

            const rels = await this.artifacts.getRelationships(id);
            for (const rel of rels) {
                const key = `${rel.sourceArtifactId}->${rel.targetArtifactId}:${rel.relation}`;
                if (!seenEdgeKeys.has(key)) {
                    seenEdgeKeys.add(key);
                    edges.push({ from: rel.sourceArtifactId, to: rel.targetArtifactId, relation: rel.relation });
                }

                const neighborId = rel.sourceArtifactId === id ? rel.targetArtifactId : rel.sourceArtifactId;
                if (!visited.has(neighborId)) {
                    visited.set(neighborId, dist + 1);
                    queue.push({ id: neighborId, dist: dist + 1 });
                }
            }
        }

        const nodes = [];
        for (const id of visited.keys()) {
            const artifact = await this.artifacts.get(id);
            if (artifact) nodes.push(metadataToNode(artifact.metadata));
        }

        return { nodes, edges };
    }
}