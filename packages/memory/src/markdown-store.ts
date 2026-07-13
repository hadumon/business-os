import { readFile, writeFile, unlink, readdir, mkdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { MemoryDocument } from "@business-os/core";

export class MarkdownStore {
  constructor(private rootDir: string) {}

  private resolvePath(path: string): string {
    return join(this.rootDir, path);
  }

  async read(path: string): Promise<MemoryDocument | null> {
    const fullPath = this.resolvePath(path);
    try {
      const content = await readFile(fullPath, "utf-8");
      const stats = await stat(fullPath);
      return {
        id: path,
        path,
        content,
        updatedAt: stats.mtimeMs,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async write(path: string, content: string): Promise<MemoryDocument> {
    const fullPath = this.resolvePath(path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
    const stats = await stat(fullPath);
    return { id: path, path, content, updatedAt: stats.mtimeMs };
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    try {
      await unlink(fullPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async listAll(): Promise<string[]> {
    const results: string[] = [];

    async function walk(dir: string, root: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
        throw err;
      }
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, root);
        } else if (entry.name.endsWith(".md")) {
          results.push(relative(root, fullPath).split("\\").join("/"));
        }
      }
    }

    await walk(this.rootDir, this.rootDir);
    return results;
  }
}
