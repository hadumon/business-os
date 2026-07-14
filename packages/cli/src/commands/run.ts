import { Command } from "commander";
import { workspaceExists, buildRuntime } from "../workspace.js";
import { discoverAgent } from "@business-os/agent-discover";
import { strategyAgent } from "@business-os/agent-strategy";

/** Central registry of agents the CLI knows how to run, keyed by id. */
const AVAILABLE_AGENTS = {
  discover: discoverAgent,
  strategy: strategyAgent,
} as const;

export function registerRunCommand(program: Command): void {
  program
    .command("run <agent>")
    .description("Run a registered agent by id (e.g. `bos run discover`)")
    .requiredOption("-p, --project <name>", "project name")
    .requiredOption("-t, --topic <topic>", "topic to run the agent on")
    .action(async (agentId: string, opts: { project: string; topic: string }) => {
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

      const { runtime } = buildRuntime();
      runtime.register(agent);

      console.log(`Running "${agentId}" on topic "${opts.topic}"...\n`);

      const result = await runtime.execute(agentId, { project: opts.project, topic: opts.topic });

      if (!result.success) {
        console.error(`Agent run failed: ${result.error}`);
        process.exitCode = 1;
        return;
      }

      console.log("Run complete.");
      console.log(JSON.stringify(result.output, null, 2));
    });
}
