import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface SqliteRecord {
  id: string;
  collection: string;
  data: string; // JSON-serialized
  updatedAt: number;
}

export class SqliteStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data TEXT NOT NULL,
        updatedAt INTEGER NOT NULL,
        PRIMARY KEY (id, collection)
      );
    `);
  }

  upsert(record: SqliteRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO records (id, collection, data, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id, collection) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt;
    `);
    stmt.run(record.id, record.collection, record.data, record.updatedAt);
  }

  get(id: string, collection: string): SqliteRecord | undefined {
    const stmt = this.db.prepare(
      `SELECT id, collection, data, updatedAt FROM records WHERE id = ? AND collection = ?;`,
    );
    return stmt.get(id, collection) as unknown as SqliteRecord | undefined;
  }

  list(collection: string): SqliteRecord[] {
    const stmt = this.db.prepare(
      `SELECT id, collection, data, updatedAt FROM records WHERE collection = ? ORDER BY updatedAt DESC;`,
    );
    return stmt.all(collection) as unknown as SqliteRecord[];
  }

  delete(id: string, collection: string): void {
    const stmt = this.db.prepare(`DELETE FROM records WHERE id = ? AND collection = ?;`);
    stmt.run(id, collection);
  }

  close(): void {
    this.db.close();
  }
}
