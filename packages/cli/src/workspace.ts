import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { FileMemory } from "@business-os/memory";
import { SqliteArtifactManager } from "@business-os/artifacts";
import { Runtime } from "@business-os/runtime";

export interface BusinessConfig {
  project: string;
  version: string;
  createdAt: number;
}

export const BUSINESS_DIR = ".business";
export const CONFIG_FILE = "business.config.json";

export function resolveWorkspaceRoot(cwd = process.cwd()): string {
  return resolve(cwd, BUSINESS_DIR);
}

export function workspaceExists(cwd = process.cwd()): boolean {
  return existsSync(resolveWorkspaceRoot(cwd));
}

export async function readConfig(cwd = process.cwd()): Promise<BusinessConfig | null> {
  const configPath = join(resolveWorkspaceRoot(cwd), CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw) as BusinessConfig;
}

export async function initWorkspace(project: string, cwd = process.cwd()): Promise<void> {
  const root = resolveWorkspaceRoot(cwd);
  await mkdir(join(root, "artifacts"), { recursive: true });
  await mkdir(join(root, "memory"), { recursive: true });
  await mkdir(join(root, "state"), { recursive: true });

  const config: BusinessConfig = {
    project,
    version: "0.1.0",
    createdAt: Date.now(),
  };
  await writeFile(join(root, CONFIG_FILE), JSON.stringify(config, null, 2), "utf-8");
}

/** Builds the same Memory + Artifacts + Runtime wiring every command needs. */
export function buildRuntime(cwd = process.cwd()): {
  runtime: Runtime;
  memory: FileMemory;
  artifacts: SqliteArtifactManager;
} {
  const root = resolveWorkspaceRoot(cwd);
  const memory = new FileMemory({ rootDir: root });
  const artifacts = new SqliteArtifactManager({ rootDir: root });
  const runtime = new Runtime({ dependencies: { memory, artifacts } });
  return { runtime, memory, artifacts };
}
