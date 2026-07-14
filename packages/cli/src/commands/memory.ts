import { Command } from "commander";
import { workspaceExists, buildRuntime } from "../workspace.js";

export function registerMemoryCommand(program: Command): void {
  program
    .command("memory")
    .description("Display memory documents in the current workspace")
    .option("--path <prefix>", "filter by path prefix")
    .option("--keyword <keyword>", "filter by keyword")
    .action(async (opts: { path?: string; keyword?: string }) => {
      if (!workspaceExists()) {
        console.error("No .business workspace found. Run `bos init` first.");
        process.exitCode = 1;
        return;
      }

      const { memory } = buildRuntime();
      const docs = await memory.query({ path: opts.path, keyword: opts.keyword });

      if (docs.length === 0) {
        console.log("No memory documents found.");
        return;
      }

      console.log(`Found ${docs.length} document(s):\n`);
      for (const doc of docs) {
        console.log(`  ${doc.path}  (updated ${new Date(doc.updatedAt).toISOString()})`);
      }
    });
}
