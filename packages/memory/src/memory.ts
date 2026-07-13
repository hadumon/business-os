import type { Memory as MemoryInterface, MemoryDocument, MemoryQuery } from "@business-os/core";
import { MarkdownStore } from "./markdown-store.js";

export interface MemoryOptions {
  rootDir: string; // e.g. ".business"
}

export class FileMemory implements MemoryInterface {
  private markdown: MarkdownStore;

  constructor(options: MemoryOptions) {
    this.markdown = new MarkdownStore(options.rootDir);
  }

  async read(path: string): Promise<MemoryDocument | null> {
    return this.markdown.read(path);
  }

  async write(path: string, content: string): Promise<MemoryDocument> {
    return this.markdown.write(path, content);
  }

  async delete(path: string): Promise<void> {
    return this.markdown.delete(path);
  }

  async query(query: MemoryQuery): Promise<MemoryDocument[]> {
    const allPaths = await this.markdown.listAll();
    const filteredPaths = query.path ? allPaths.filter((p) => p.startsWith(query.path!)) : allPaths;

    const docs: MemoryDocument[] = [];
    for (const path of filteredPaths) {
      const doc = await this.markdown.read(path);
      if (!doc) continue;
      if (query.keyword && !doc.content.toLowerCase().includes(query.keyword.toLowerCase())) {
        continue;
      }
      docs.push(doc);
      if (query.limit && docs.length >= query.limit) break;
    }

    return docs;
  }
}
