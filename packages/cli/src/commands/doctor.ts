import { Command } from "commander";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { workspaceExists, readConfig, resolveWorkspaceRoot } from "../workspace.js";

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check that the current environment and workspace are healthy")
    .action(async () => {
      const checks: CheckResult[] = [];

      const [major] = process.versions.node.split(".").map(Number);
      checks.push({
        label: "Node.js version >= 22",
        ok: (major ?? 0) >= 22,
        detail: `found ${process.versions.node}`,
      });

      const hasWorkspace = workspaceExists();
      checks.push({ label: ".business workspace exists", ok: hasWorkspace });

      if (hasWorkspace) {
        const root = resolveWorkspaceRoot();
        const config = await readConfig();
        checks.push({ label: "business.config.json readable", ok: config !== null });
        checks.push({
          label: "artifacts/ directory exists",
          ok: existsSync(join(root, "artifacts")),
        });
        checks.push({ label: "memory/ directory exists", ok: existsSync(join(root, "memory")) });
        checks.push({ label: "state/ directory exists", ok: existsSync(join(root, "state")) });
        checks.push({
          label: "artifacts SQLite database exists",
          ok: existsSync(join(root, "state", "artifacts.sqlite")),
          detail: "created on first artifact write, not on init",
        });
      }

      console.log("BusinessOS Doctor\n");
      let allOk = true;
      for (const check of checks) {
        const icon = check.ok ? "✓" : "✗";
        console.log(`  ${icon} ${check.label}${check.detail ? ` (${check.detail})` : ""}`);
        if (!check.ok) allOk = false;
      }
      console.log("");
      console.log(
        allOk
          ? "All checks passed."
          : "Some checks failed — run `bos init` if the workspace is missing.",
      );
      if (!allOk) process.exitCode = 1;
    });
}
