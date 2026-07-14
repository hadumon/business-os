import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { initWorkspace, workspaceExists, readConfig, buildRuntime } from "./workspace.js";

describe("workspace", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "business-os-cli-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("reports no workspace before init", () => {
    expect(workspaceExists(cwd)).toBe(false);
  });

  it("creates the expected directory structure on init", async () => {
    await initWorkspace("acme", cwd);

    expect(workspaceExists(cwd)).toBe(true);
    expect(existsSync(join(cwd, ".business", "artifacts"))).toBe(true);
    expect(existsSync(join(cwd, ".business", "memory"))).toBe(true);
    expect(existsSync(join(cwd, ".business", "state"))).toBe(true);
    expect(existsSync(join(cwd, ".business", "business.config.json"))).toBe(true);
  });

  it("persists a readable config", async () => {
    await initWorkspace("acme", cwd);
    const config = await readConfig(cwd);

    expect(config).not.toBeNull();
    expect(config!.project).toBe("acme");
  });

  it("buildRuntime wires memory and artifacts against the workspace root", async () => {
    await initWorkspace("acme", cwd);
    const { memory, artifacts } = buildRuntime(cwd);

    await memory.write("note.md", "hello");
    const doc = await memory.read("note.md");
    expect(doc!.content).toBe("hello");

    const artifact = await artifacts.create({
      project: "acme",
      type: "report",
      title: "Test",
      content: "content",
      author: "test",
    });
    expect(artifact.metadata.version).toBe(1);

    artifacts.close();
  });
});
