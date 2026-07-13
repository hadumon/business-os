export type ArtifactType =
  | "strategy-report"
  | "prd"
  | "roadmap"
  | "sprint-plan"
  | "marketing-plan"
  | "investor-memo"
  | "custom";

export interface ArtifactVersion {
  version: number;
  createdAt: number;
  content: string;
  authorAgentId: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  versions: ArtifactVersion[];
  currentVersion: number;
  metadata?: Record<string, unknown>;
}

export interface ArtifactManager {
  create(input: Omit<Artifact, "id" | "versions" | "currentVersion">): Promise<Artifact>;
  get(id: string): Promise<Artifact | null>;
  addVersion(id: string, version: Omit<ArtifactVersion, "version">): Promise<Artifact>;
  list(filter?: Partial<Pick<Artifact, "type">>): Promise<Artifact[]>;
}
