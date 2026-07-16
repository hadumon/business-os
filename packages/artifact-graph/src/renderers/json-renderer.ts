import type { ArtifactGraph } from "../types.js";

export function renderJson(graph: ArtifactGraph): string {
    return JSON.stringify(graph, null, 2);
}