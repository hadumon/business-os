import { Command } from "commander";
import { workspaceExists, buildRuntime } from "../workspace.js";
import type { ArtifactType } from "@business-os/artifact-core";

export function registerArtifactsCommand(program: Command): void {
  program
    .command("artifacts")
    .description("List artifacts in the current workspace")
    .option("-p, --project <name>", "filter by project")
    .option("-t, --type <type>", "filter by artifact type (e.g. report, prd, strategy)")
    .action(async (opts: { project?: string; type?: string }) => {
      if (!workspaceExists()) {
        console.error("No .business workspace found. Run `bos init` first.");
        process.exitCode = 1;
        return;
      }

      const { artifacts } = buildRuntime();
      const list = await artifacts.list({
        project: opts.project,
        type: opts.type as ArtifactType | undefined,
      });

      if (list.length === 0) {
        console.log("No artifacts found.");
        return;
      }

      console.log(`Found ${list.length} artifact(s):\n`);
      for (const a of list) {
        console.log(`  [${a.type}] ${a.title}`);
        console.log(`    id: ${a.id}  version: ${a.version}  status: ${a.status}`);
        console.log(`    project: ${a.project}  updated: ${new Date(a.updatedAt).toISOString()}`);
        console.log("");
      }
    });
}
