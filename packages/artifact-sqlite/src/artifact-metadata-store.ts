import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  ArtifactFilter,
  ArtifactMetadata,
  ArtifactRelationship,
} from "@business-os/artifact-core";

interface MetadataRow {
  id: string;
  project: string;
  type: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  parentVersion: number | null;
  status: string;
  author: string;
  tags: string;
  path: string;
}

function rowToMetadata(row: MetadataRow): ArtifactMetadata {
  return {
    ...row,
    type: row.type as ArtifactMetadata["type"],
    status: row.status as ArtifactMetadata["status"],
    tags: JSON.parse(row.tags) as string[],
  };
}

export class ArtifactMetadataStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifact_versions (
        id TEXT NOT NULL,
        project TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        version INTEGER NOT NULL,
        parentVersion INTEGER,
        status TEXT NOT NULL,
        author TEXT NOT NULL,
        tags TEXT NOT NULL,
        path TEXT NOT NULL,
        PRIMARY KEY (id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_artifact_project ON artifact_versions(project);
      CREATE INDEX IF NOT EXISTS idx_artifact_type ON artifact_versions(type);
      CREATE INDEX IF NOT EXISTS idx_artifact_status ON artifact_versions(status);

      CREATE TABLE IF NOT EXISTS artifact_relationships (
        id TEXT PRIMARY KEY,
        sourceArtifactId TEXT NOT NULL,
        targetArtifactId TEXT NOT NULL,
        relation TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rel_source ON artifact_relationships(sourceArtifactId);
      CREATE INDEX IF NOT EXISTS idx_rel_target ON artifact_relationships(targetArtifactId);
    `);
  }

  insertVersion(meta: ArtifactMetadata): void {
    const stmt = this.db.prepare(`
      INSERT INTO artifact_versions
        (id, project, type, title, createdAt, updatedAt, version, parentVersion, status, author, tags, path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      meta.id,
      meta.project,
      meta.type,
      meta.title,
      meta.createdAt,
      meta.updatedAt,
      meta.version,
      meta.parentVersion,
      meta.status,
      meta.author,
      JSON.stringify(meta.tags),
      meta.path,
    );
  }

  getVersion(id: string, version: number): ArtifactMetadata | null {
    const stmt = this.db.prepare(`SELECT * FROM artifact_versions WHERE id = ? AND version = ?;`);
    const row = stmt.get(id, version) as MetadataRow | undefined;
    return row ? rowToMetadata(row) : null;
  }

  getLatest(id: string): ArtifactMetadata | null {
    const stmt = this.db.prepare(
      `SELECT * FROM artifact_versions WHERE id = ? ORDER BY version DESC LIMIT 1;`,
    );
    const row = stmt.get(id) as MetadataRow | undefined;
    return row ? rowToMetadata(row) : null;
  }

  getVersions(id: string): ArtifactMetadata[] {
    const stmt = this.db.prepare(
      `SELECT * FROM artifact_versions WHERE id = ? ORDER BY version ASC;`,
    );
    return (stmt.all(id) as unknown as MetadataRow[]).map(rowToMetadata);
  }

  list(filter: ArtifactFilter = {}): ArtifactMetadata[] {
    // Only consider each artifact's latest version per id.
    const stmt = this.db.prepare(`
      SELECT av.* FROM artifact_versions av
      INNER JOIN (
        SELECT id, MAX(version) AS maxVersion FROM artifact_versions GROUP BY id
      ) latest ON av.id = latest.id AND av.version = latest.maxVersion
      ORDER BY av.updatedAt DESC;
    `);
    let rows = stmt.all() as unknown as MetadataRow[];

    if (filter.project) rows = rows.filter((r) => r.project === filter.project);
    if (filter.type) rows = rows.filter((r) => r.type === filter.type);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter.minVersion) rows = rows.filter((r) => r.version >= filter.minVersion!);
    if (filter.createdAfter) rows = rows.filter((r) => r.createdAt >= filter.createdAfter!);
    if (filter.tag) {
      rows = rows.filter((r) => (JSON.parse(r.tags) as string[]).includes(filter.tag!));
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(kw));
    }

    return rows.map(rowToMetadata);
  }

  deleteAll(id: string): void {
    this.db.prepare(`DELETE FROM artifact_versions WHERE id = ?;`).run(id);
    this.db
      .prepare(
        `DELETE FROM artifact_relationships WHERE sourceArtifactId = ? OR targetArtifactId = ?;`,
      )
      .run(id, id);
  }

  insertRelationship(rel: ArtifactRelationship): void {
    const stmt = this.db.prepare(`
      INSERT INTO artifact_relationships (id, sourceArtifactId, targetArtifactId, relation, createdAt)
      VALUES (?, ?, ?, ?, ?);
    `);
    stmt.run(rel.id, rel.sourceArtifactId, rel.targetArtifactId, rel.relation, rel.createdAt);
  }

  getRelationships(artifactId: string): ArtifactRelationship[] {
    const stmt = this.db.prepare(
      `SELECT * FROM artifact_relationships WHERE sourceArtifactId = ? OR targetArtifactId = ?;`,
    );
    return stmt.all(artifactId, artifactId) as unknown as ArtifactRelationship[];
  }

  close(): void {
    this.db.close();
  }
}
