import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * Layout: {rootDir}/{type}/{id}/v{version}.md
 * Clean Markdown only — no frontmatter, no metadata. SQLite owns metadata.
 */
export class ArtifactFileStore {
  constructor(private rootDir: string) {}

  private artifactDir(type: string, id: string): string {
    return join(this.rootDir, type, id);
  }

  private versionPath(type: string, id: string, version: number): string {
    return join(this.artifactDir(type, id), `v${version}.md`);
  }

  async writeVersion(type: string, id: string, version: number, content: string): Promise<string> {
    const dir = this.artifactDir(type, id);
    await mkdir(dir, { recursive: true });
    const path = this.versionPath(type, id, version);
    await writeFile(path, content, "utf-8");
    return path;
  }

  async readVersion(type: string, id: string, version: number): Promise<string | null> {
    try {
      return await readFile(this.versionPath(type, id, version), "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async deleteArtifact(type: string, id: string): Promise<void> {
    await rm(this.artifactDir(type, id), { recursive: true, force: true });
  }
}
