import { join } from "node:path";
import {
  generateArtifactId,
  generateRelationshipId,
  type Artifact,
  type ArtifactFilter,
  type ArtifactManager,
  type ArtifactMetadata,
  type ArtifactRelationship,
  type CreateArtifactInput,
  type UpdateArtifactInput,
} from "@business-os/artifact-core";
import { ArtifactFileStore } from "@business-os/artifact-files";
import { ArtifactMetadataStore } from "@business-os/artifact-sqlite";

export interface SqliteArtifactManagerOptions {
  rootDir: string; // e.g. ".business"
}

export class SqliteArtifactManager implements ArtifactManager {
  private files: ArtifactFileStore;
  private meta: ArtifactMetadataStore;

  constructor(options: SqliteArtifactManagerOptions) {
    this.files = new ArtifactFileStore(join(options.rootDir, "artifacts"));
    this.meta = new ArtifactMetadataStore(join(options.rootDir, "state", "artifacts.sqlite"));
  }

  async create(input: CreateArtifactInput): Promise<Artifact> {
    const id = generateArtifactId(input.type);
    const now = Date.now();
    const version = 1;

    const path = await this.files.writeVersion(input.type, id, version, input.content);

    const metadata: ArtifactMetadata = {
      id,
      project: input.project,
      type: input.type,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      version,
      parentVersion: null,
      status: input.status ?? "draft",
      author: input.author,
      tags: input.tags ?? [],
      path,
    };

    this.meta.insertVersion(metadata);
    return { metadata, content: input.content };
  }

  async update(id: string, input: UpdateArtifactInput): Promise<Artifact> {
    const current = this.meta.getLatest(id);
    if (!current) {
      throw new Error(`Cannot update artifact "${id}": no existing versions found`);
    }

    const nextVersion = current.version + 1;
    const now = Date.now();
    const path = await this.files.writeVersion(current.type, id, nextVersion, input.content);

    const metadata: ArtifactMetadata = {
      ...current,
      updatedAt: now,
      version: nextVersion,
      parentVersion: current.version,
      status: input.status ?? current.status,
      author: input.author,
      path,
    };

    this.meta.insertVersion(metadata);
    return { metadata, content: input.content };
  }

  async get(id: string, version?: number): Promise<Artifact | null> {
    const metadata = version ? this.meta.getVersion(id, version) : this.meta.getLatest(id);
    if (!metadata) return null;

    const content = await this.files.readVersion(metadata.type, id, metadata.version);
    if (content === null) return null;

    return { metadata, content };
  }

  async latest(id: string): Promise<Artifact | null> {
    return this.get(id);
  }

  async versions(id: string): Promise<ArtifactMetadata[]> {
    return this.meta.getVersions(id);
  }

  async list(filter?: ArtifactFilter): Promise<ArtifactMetadata[]> {
    return this.meta.list(filter);
  }

  async delete(id: string): Promise<void> {
    const latest = this.meta.getLatest(id);
    if (!latest) return;
    await this.files.deleteArtifact(latest.type, id);
    this.meta.deleteAll(id);
  }

  async linkRelationship(
    sourceArtifactId: string,
    targetArtifactId: string,
    relation: ArtifactRelationship["relation"],
  ): Promise<ArtifactRelationship> {
    const rel: ArtifactRelationship = {
      id: generateRelationshipId(),
      sourceArtifactId,
      targetArtifactId,
      relation,
      createdAt: Date.now(),
    };
    this.meta.insertRelationship(rel);
    return rel;
  }

  async getRelationships(artifactId: string): Promise<ArtifactRelationship[]> {
    return this.meta.getRelationships(artifactId);
  }

  close(): void {
    this.meta.close();
  }
}
