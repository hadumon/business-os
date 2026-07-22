import { Command } from "commander";
import { workspaceExists, buildRuntime } from "../workspace.js";
import { Pipeline } from "@business-os/workflow";
import { DASNA_PIPELINES } from "@dasna/pipelines";
import { discoverAgent } from "@business-os/agent-discover";
import { strategyAgent } from "@business-os/agent-strategy";
import { productAgent } from "@business-os/agent-product";
import { salesAgent } from "@dasna/agent-sales";
import { catalogAgent } from "@dasna/agent-catalog";
import { marketingAgent } from "@dasna/agent-marketing";
import { supportAgent } from "@dasna/agent-support";
import { inventoryAgent } from "@dasna/agent-inventory";
import { analyticsAgent } from "@dasna/agent-analytics";

const ALL_AGENTS = [
  discoverAgent,
  strategyAgent,
  productAgent,
  salesAgent,
  catalogAgent,
  marketingAgent,
  supportAgent,
  inventoryAgent,
  analyticsAgent,
];

export function registerPipelineCommand(program: Command): void {
  const pipelineCmd = program
    .command("pipeline")
    .description("Manage and execute multi-agent pipelines");

  pipelineCmd
    .command("list")
    .description("List available pipeline presets")
    .action(() => {
      console.log("Available Pipelines:\n");
      for (const [id, def] of Object.entries(DASNA_PIPELINES)) {
        console.log(`  ${id}`);
        console.log(`    description: ${def.description}`);
        console.log(`    steps: ${def.steps.map((s) => s.agentId).join(" -> ")}\n`);
      }
    });

  pipelineCmd
    .command("show <name>")
    .description("Show execution steps for a specific pipeline preset")
    .action((name: string) => {
      const def = DASNA_PIPELINES[name];
      if (!def) {
        console.error(`Unknown pipeline "${name}". Available: ${Object.keys(DASNA_PIPELINES).join(", ")}`);
        process.exitCode = 1;
        return;
      }
      console.log(`Pipeline: ${def.id}`);
      console.log(`Description: ${def.description}\n`);
      def.steps.forEach((step, i) => {
        console.log(`  ${i + 1}. agent: ${step.agentId}`);
        if (i < def.steps.length - 1) console.log("     ↓");
      });
    });

  pipelineCmd
    .command("run <name>")
    .description("Execute a named pipeline preset")
    .requiredOption("-p, --project <name>", "project name")
    .option("-t, --topic <topic>", "topic (required for pipelines that start with discover/strategy)")
    .option("--dry-run", "preview pipeline execution steps without running agents")
    .action(async (name: string, opts: { project: string; topic?: string; dryRun?: boolean }) => {
      if (!workspaceExists()) {
        console.error("No .business workspace found. Run `bos init` first.");
        process.exitCode = 1;
        return;
      }

      const def = DASNA_PIPELINES[name];
      if (!def) {
        console.error(`Unknown pipeline "${name}". Available: ${Object.keys(DASNA_PIPELINES).join(", ")}`);
        process.exitCode = 1;
        return;
      }

      const { runtime } = buildRuntime();

      // Register all agents with runtime
      for (const agent of ALL_AGENTS) {
        runtime.register(agent);
      }

      const pipeline = new Pipeline(def, runtime.context.events);

      if (opts.dryRun) {
        console.log(`[DRY RUN] Pipeline "${def.id}" (${def.description})\n`);
        const steps = pipeline.preview();
        steps.forEach((step, i) => {
          console.log(`  Step ${i + 1}: ${step}`);
        });
        return;
      }

      // Check if topic is required
      const stepAgentIds = def.steps.map((s) => s.agentId);
      if ((stepAgentIds.includes("discover") || stepAgentIds.includes("strategy")) && !opts.topic) {
        console.error(`Pipeline "${name}" includes discover/strategy step and requires --topic <topic>`);
        process.exitCode = 1;
        return;
      }

      console.log(`Starting pipeline "${def.id}" (${def.description})...\n`);

      // Subscribe to events for real-time output
      runtime.context.events.on("pipeline.step.started", (e) => {
        const payload = e.payload as { agentId: string; stepIndex: number };
        console.log(`↳ [Step ${payload.stepIndex + 1}/${def.steps.length}] Running agent "${payload.agentId}"...`);
      });

      runtime.context.events.on("pipeline.step.completed", (e) => {
        const payload = e.payload as { agentId: string; artifactId?: string; durationMs: number };
        console.log(
          `  ✓ "${payload.agentId}" completed in ${payload.durationMs}ms${
            payload.artifactId ? ` (artifact: ${payload.artifactId})` : ""
          }\n`
        );
      });

      runtime.context.events.on("pipeline.step.failed", (e) => {
        const payload = e.payload as { agentId: string; error?: string };
        console.error(`  ✗ "${payload.agentId}" failed: ${payload.error ?? "unknown error"}\n`);
      });

      const result = await pipeline.run(runtime, {
        project: opts.project,
        ...(opts.topic ? { topic: opts.topic } : {}),
      });

      if (!result.success) {
        console.error(`Pipeline failed at step "${result.failedStep}": ${result.error}`);
        process.exitCode = 1;
        return;
      }

      console.log(`Pipeline "${def.id}" completed successfully in ${result.durationMs}ms.`);
      console.log(`Artifacts produced:`);
      for (const [agentId, artifactId] of Object.entries(result.artifacts)) {
        console.log(`  - ${agentId}: ${artifactId}`);
      }
    });
}
