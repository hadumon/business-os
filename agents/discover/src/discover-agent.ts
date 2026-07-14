import { defineAgent, z } from "@business-os/sdk";
import { buildDiscoverPipeline } from "./build-pipeline.js";
import { renderDiscoverReport } from "./render-report.js";
import type { DiscoverPipelineState } from "./types.js";

export const discoverInputSchema = z.object({
  project: z.string().min(1),
  topic: z.string().min(1),
  author: z.string().optional(),
});

export const discoverOutputSchema = z.object({
  artifactId: z.string(),
  opportunityScore: z.number(),
  recommendation: z.string(),
});

export const discoverAgent = defineAgent({
  id: "discover",
  description:
    "Runs a full market discovery pipeline: market scan, problem discovery, competitor analysis, demand validation, opportunity scoring, business model proposal, risk analysis, and recommendation.",
  inputSchema: discoverInputSchema,
  outputSchema: discoverOutputSchema,
  execute: async (ctx) => {
    const runId = `${Date.now()}`;
    const author = ctx.input.author ?? "agent:discover";

    const pipeline = buildDiscoverPipeline(runId);

    // Forward every workflow event onto the agent's own event bus so callers
    // can observe progress without knowing the pipeline is a Workflow at all.
    for (const type of [
      "workflow.started",
      "node.started",
      "node.retrying",
      "node.completed",
      "node.failed",
      "workflow.completed",
      "workflow.failed",
    ] as const) {
      pipeline.events.on(type, (event) => {
        ctx.events.emit({ ...event, source: "agent:discover" });
      });
    }

    const initialState: DiscoverPipelineState = {
      project: ctx.input.project,
      topic: ctx.input.topic,
      author,
    };

    ctx.logger.info("Starting discover pipeline", { topic: ctx.input.topic });
    await pipeline.start(initialState);

    const finalState = pipeline.getState();
    const lastNode = finalState[finalState.length - 1];

    if (!lastNode || lastNode.status !== "complete") {
      throw new Error(
        `Discover pipeline did not complete successfully (last node: ${lastNode?.nodeId ?? "unknown"}, status: ${lastNode?.status ?? "unknown"})`,
      );
    }

    const result = lastNode.output as DiscoverPipelineState;

    // Persist working notes to memory (not the final deliverable — that's the artifact).
    await ctx.memory.write(
      `discover/${ctx.input.project}/${runId}.md`,
      `# Discover run notes\n\nTopic: ${ctx.input.topic}\nRun: ${runId}\n\nRaw pipeline state:\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`,
    );

    const artifact = await ctx.artifacts.create({
      project: ctx.input.project,
      type: "report",
      title: `Discovery Report: ${ctx.input.topic}`,
      content: renderDiscoverReport(result),
      author,
      tags: ["discover", ctx.input.topic],
      status: "draft",
    });

    ctx.logger.info("Discover pipeline complete", {
      artifactId: artifact.metadata.id,
      opportunityScore: result.opportunityScore,
    });

    return {
      artifactId: artifact.metadata.id,
      opportunityScore: result.opportunityScore ?? 0,
      recommendation: result.recommendation ?? "",
    };
  },
});
