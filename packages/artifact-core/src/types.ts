export type ArtifactType =
  "strategy" | "prd" | "roadmap" | "sprint" | "marketing" | "investor" | "report" | "unknown";

export type ArtifactStatus = "draft" | "review" | "approved" | "archived";

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
}

export interface UpdateArtifactInput {
  content: string;
  author: string;
  status?: ArtifactStatus;
}

export interface ArtifactFilter {
  project?: string;
  type?: ArtifactType;
  status?: ArtifactStatus;
  tag?: string;
  keyword?: string;
  minVersion?: number;
  createdAfter?: number;
}
