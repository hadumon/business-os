import type { ArtifactMetadata, ArtifactRelationship } from "@business-os/artifact-core";

export interface GraphNode {
    id: string;
    type: string;
    title: string;
    status: string;
    project: string;
    version: number;
}

export interface GraphEdge {
    from: string;
    to: string;
    relation: ArtifactRelationship["relation"];
}

export interface ArtifactGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export function metadataToNode(meta: ArtifactMetadata): GraphNode {
    return {
        id: meta.id,
        type: meta.type,
        title: meta.title,
        status: meta.status,
        project: meta.project,
        version: meta.version,
    };
}