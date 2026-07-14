import { Command } from "commander";
import { workspaceExists, initWorkspace } from "../workspace.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new BusinessOS workspace in the current directory")
    .option("-p, --project <name>", "project name", "default")
    .action(async (opts: { project: string }) => {
      if (workspaceExists()) {
        console.log("A .business workspace already exists here.");
        return;
      }
      await initWorkspace(opts.project);
      console.log(`Initialized .business workspace for project "${opts.project}"`);
      console.log("  .business/artifacts/");
      console.log("  .business/memory/");
      console.log("  .business/state/");
      console.log("  .business/business.config.json");
    });
}
