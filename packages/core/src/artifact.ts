export type ArtifactType =
  | "strategy"
  | "prd"
  | "roadmap"
  | "sprint"
  | "marketing"
  | "investor"
  | "report"
  | "insight"
  | "unknown";

export type ArtifactStatus = "draft" | "review" | "approved" | "archived";

export interface ArtifactProvenance {
  generatedBy: {
    agentId: string;
    capabilityIds?: string[];
    workflowId?: string;
  };
  inputArtifactIds: string[];
  frameworkVersion: string;
  createdAt: number;
}

export interface ArtifactMetadata {
  id: string;
  project: string;
  type: ArtifactType;
  title: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  parentVersion: number | null;
  status: ArtifactStatus;
  author: string;
  tags: string[];
  path: string;
  /** Optional: full generation lineage. Absent for artifacts created before provenance was introduced. */
  provenance?: ArtifactProvenance;
}

export interface ArtifactRelationship {
  id: string;
  sourceArtifactId: string;
  targetArtifactId: string;
  relation: "generated" | "references" | "supersedes";
  createdAt: number;
}

export interface Artifact {
  metadata: ArtifactMetadata;
  content: string;
}

export interface CreateArtifactInput {
  project: string;
  type: ArtifactType;
  title: string;
  content: string;
  author: string;
  tags?: string[];
  status?: ArtifactStatus;
  provenance?: ArtifactProvenance;
}

export interface UpdateArtifactInput {
  content: string;
  author: string;
  status?: ArtifactStatus;
  provenance?: ArtifactProvenance;
}

export interface ArtifactFilter {
  project?: string | undefined;
  type?: ArtifactType | undefined;
  status?: ArtifactStatus | undefined;
  tag?: string | undefined;
  keyword?: string | undefined;
  minVersion?: number | undefined;
  createdAfter?: number | undefined;
}

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
