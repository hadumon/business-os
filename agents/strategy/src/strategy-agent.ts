import { defineAgent, z } from "@business-os/sdk";
import type { CapabilityContext } from "@business-os/capability-core";
import {
  marketResearchCapability,
  competitorAnalysisCapability,
  swotCapability,
  pricingCapability,
  demandValidationCapability,
  scoringCapability,
} from "@business-os/capabilities";

export const strategyInputSchema = z.object({
  project: z.string().min(1),
  topic: z.string().min(1),
  author: z.string().optional(),
  /** Optional: link this Strategy artifact back to the Discover artifact that motivated it. */
  sourceArtifactId: z.string().optional(),
});

export const strategyOutputSchema = z.object({
  artifactId: z.string(),
  opportunityScore: z.number(),
});

function renderStrategyReport(input: {
  topic: string;
  problemStatement: string;
  competitors: { name: string; strength: number; notes: string }[];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  pricing: { model: string; rationale: string };
  opportunityScore: number;
}): string {
  const lines: string[] = [];
  lines.push(`# Strategy Report: ${input.topic}`);
  lines.push("");
  lines.push("## Problem Statement");
  lines.push(input.problemStatement);
  lines.push("");
  lines.push("## Competitive Landscape");
  for (const c of input.competitors) lines.push(`- **${c.name}** — ${c.notes}`);
  lines.push("");
  lines.push("## SWOT");
  lines.push(`**Strengths:** ${input.swot.strengths.join("; ")}`);
  lines.push(`**Weaknesses:** ${input.swot.weaknesses.join("; ")}`);
  lines.push(`**Opportunities:** ${input.swot.opportunities.join("; ") || "none identified"}`);
  lines.push(`**Threats:** ${input.swot.threats.join("; ") || "none identified"}`);
  lines.push("");
  lines.push("## Proposed Business Model");
  lines.push(input.pricing.rationale);
  lines.push("");
  lines.push("## Opportunity Score");
  lines.push(`**${input.opportunityScore} / 100**`);
  lines.push("");
  return lines.join("\n");
}

export const strategyAgent = defineAgent({
  id: "strategy",
  description:
    "Composes market research, competitor analysis, SWOT, and pricing capabilities into a Strategy Report artifact.",
  inputSchema: strategyInputSchema,
  outputSchema: strategyOutputSchema,
  execute: async (ctx) => {
    const author = ctx.input.author ?? "agent:strategy";
    const capCtx: CapabilityContext = { memory: ctx.memory, logger: ctx.logger };

    const research = await marketResearchCapability.run(capCtx, { topic: ctx.input.topic });
    const competitorAnalysis = await competitorAnalysisCapability.run(capCtx, {
      topic: ctx.input.topic,
    });
    const demand = await demandValidationCapability.run(capCtx, {
      signals: research.signals,
      competitors: competitorAnalysis.competitors,
    });
    const scored = await scoringCapability.run(capCtx, {
      demandScore: demand.demandScore,
      competitorCount: competitorAnalysis.competitors.length,
    });
    const swot = await swotCapability.run(capCtx, {
      topic: ctx.input.topic,
      signals: research.signals,
      competitors: competitorAnalysis.competitors,
    });
    const pricing = await pricingCapability.run(capCtx, {
      topic: ctx.input.topic,
      opportunityScore: scored.score,
    });

    const artifact = await ctx.artifacts.create({
      project: ctx.input.project,
      type: "strategy",
      title: `Strategy Report: ${ctx.input.topic}`,
      content: renderStrategyReport({
        topic: ctx.input.topic,
        problemStatement: research.problemStatement,
        competitors: competitorAnalysis.competitors,
        swot,
        pricing,
        opportunityScore: scored.score,
      }),
      author,
      tags: ["strategy", ctx.input.topic],
      status: "draft",
    });

    if (ctx.input.sourceArtifactId) {
      await ctx.artifacts.linkRelationship(
        ctx.input.sourceArtifactId,
        artifact.metadata.id,
        "generated",
      );
    }

    ctx.logger.info("Strategy report complete", { artifactId: artifact.metadata.id });

    return { artifactId: artifact.metadata.id, opportunityScore: scored.score };
  },
});
