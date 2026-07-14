import type {
  Artifact,
  ArtifactFilter,
  ArtifactMetadata,
  ArtifactRelationship,
  CreateArtifactInput,
  UpdateArtifactInput,
} from "./types.js";

/**
 * ArtifactManager never overwrites content — update() always creates a new
 * immutable version linked to its parent via parentVersion.
 */
export interface ArtifactManager {
  create(input: CreateArtifactInput): Promise<Artifact>;
  update(id: string, input: UpdateArtifactInput): Promise<Artifact>;
  get(id: string, version?: number): Promise<Artifact | null>;
  latest(id: string): Promise<Artifact | null>;
  versions(id: string): Promise<ArtifactMetadata[]>;
  list(filter?: ArtifactFilter): Promise<ArtifactMetadata[]>;
  delete(id: string): Promise<void>;

  linkRelationship(
    sourceArtifactId: string,
    targetArtifactId: string,
    relation: ArtifactRelationship["relation"],
  ): Promise<ArtifactRelationship>;
  getRelationships(artifactId: string): Promise<ArtifactRelationship[]>;
}
