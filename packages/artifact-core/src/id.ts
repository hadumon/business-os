import { randomUUID } from "node:crypto";

/** Human-friendly, collision-safe id: {type}-{shortUuid} */
export function generateArtifactId(type: string): string {
  return `${type}-${randomUUID().slice(0, 8)}`;
}

export function generateRelationshipId(): string {
  return `rel-${randomUUID().slice(0, 8)}`;
}
