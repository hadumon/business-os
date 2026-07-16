import { Command } from "commander";
import { workspaceExists, buildRuntime } from "../workspace.js";
import { discoverAgent } from "@business-os/agent-discover";
import { strategyAgent } from "@business-os/agent-strategy";
import { productAgent } from "@business-os/agent-product";

const AVAILABLE_AGENTS = {
  discover: discoverAgent,
  strategy: strategyAgent,
  product: productAgent,
} as const;

export function registerRunCommand(program: Command): void {
  program
    .command("run <agent>")
    .description("Run a registered agent by id (e.g. `bos run discover`)")
    .requiredOption("-p, --project <name>", "project name")
    .option("-t, --topic <topic>", "topic to run the agent on (required for discover, strategy)")
    .option(
      "-f, --from <artifactId>",
      "source artifact id to link/consume (Discover id for strategy; Strategy id for product). Use 'latest' to auto-resolve the most recently updated artifact.",
    )
    .action(async (agentId: string, opts: { project: string; topic?: string; from?: string }) => {
      if (!workspaceExists()) {
        console.error("No .business workspace found. Run `bos init` first.");
        process.exitCode = 1;
        return;
      }

      const agent = AVAILABLE_AGENTS[agentId as keyof typeof AVAILABLE_AGENTS];
      if (!agent) {
        console.error(
          `Unknown agent "${agentId}". Available agents: ${Object.keys(AVAILABLE_AGENTS).join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }

      const { runtime, artifacts } = buildRuntime();

      // Resolve --from latest / validate --from exists BEFORE any agent-specific
      // input is built, so downstream branches always see a real artifact id.
      if (opts.from === "latest") {
        const list = await artifacts.list({ project: opts.project });
        if (list.length === 0) {
          console.error("No artifacts found to use as --from latest. Run a prior agent first.");
          process.exitCode = 1;
          return;
        }
        opts.from = list[0]!.id;
        console.log(`Resolved --from latest to ${opts.from}\n`);
      } else if (opts.from) {
        const exists = await artifacts.get(opts.from);
        if (!exists) {
          console.error(`Artifact "${opts.from}" not found. Run \`bos artifacts\` to see available ids.`);
          process.exitCode = 1;
          return;
        }
      }

      let input: Record<string, unknown>;
      if (agentId === "product") {
        if (!opts.from) {
          console.error("`bos run product` requires --from <strategyArtifactId>");
          process.exitCode = 1;
          return;
        }
        input = { project: opts.project, strategyArtifactId: opts.from };
      } else {
        if (!opts.topic) {
          console.error(`\`bos run ${agentId}\` requires --topic <topic>`);
          process.exitCode = 1;
          return;
        }
        input = {
          project: opts.project,
          topic: opts.topic,
          ...(opts.from ? { sourceArtifactId: opts.from } : {}),
        };
      }

      runtime.register(agent);

      console.log(`Running "${agentId}"...\n`);
      const result = await runtime.execute(agentId, input);

      if (!result.success) {
        console.error(`Agent run failed: ${result.error}`);
        process.exitCode = 1;
        return;
      }

      console.log("Run complete.");
      console.log(JSON.stringify(result.output, null, 2));
    });
}
