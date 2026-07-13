export interface MemoryDocument {
  id: string;
  path: string;
  content: string;
  updatedAt: number;
}

export interface MemoryQuery {
  path?: string;
  keyword?: string;
  limit?: number;
}

export interface Memory {
  read(path: string): Promise<MemoryDocument | null>;
  write(path: string, content: string): Promise<MemoryDocument>;
  query(query: MemoryQuery): Promise<MemoryDocument[]>;
  delete(path: string): Promise<void>;
}
