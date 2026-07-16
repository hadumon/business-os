import { defineAgent, z } from "@business-os/sdk";
import { BUSINESS_OS_VERSION } from "@business-os/artifact-core";

export const productInputSchema = z.object({
  project: z.string().min(1),
  /** The Strategy artifact this PRD is derived from. Required — Product cannot run standalone. */
  strategyArtifactId: z.string().min(1),
  author: z.string().optional(),
});

export const productOutputSchema = z.object({
  artifactId: z.string(),
});

function extractSection(markdown: string, heading: string): string | null {
  const pattern = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[1]!.trim() : null;
}

function renderPrd(input: {
  topic: string;
  problemStatement: string;
  opportunityScore: string;
  businessModel: string;
}): string {
  const lines: string[] = [];
  lines.push(`# Product Requirements Document: ${input.topic}`);
  lines.push("");
  lines.push("## Overview");
  lines.push(
    `This PRD is derived from the Strategy Report for "${input.topic}". It translates validated market opportunity into concrete product requirements.`,
  );
  lines.push("");
  lines.push("## Problem Statement");
  lines.push(input.problemStatement);
  lines.push("");
  lines.push("## Goals");
  lines.push(`- Address the validated problem with a targeted MVP`);
  lines.push(`- Support the proposed business model: ${input.businessModel}`);
  lines.push(
    `- Ship fast enough to capture the opportunity (score: ${input.opportunityScore}/100)`,
  );
  lines.push("");
  lines.push("## Requirements");
  lines.push("- [ ] Core workflow addressing the primary pain point");
  lines.push("- [ ] Onboarding flow aligned to the proposed business model");
  lines.push("- [ ] Analytics to validate demand assumptions post-launch");
  lines.push("");
  lines.push("## Out of Scope");
  lines.push("- Advanced features not required to validate the core hypothesis");
  lines.push("");
  return lines.join("\n");
}

export const productAgent = defineAgent({
  id: "product",
  description:
    "Reads a Strategy artifact and derives a Product Requirements Document (PRD) from it. Does not run capabilities directly — transforms an upstream artifact instead.",
  inputSchema: productInputSchema,
  outputSchema: productOutputSchema,
  execute: async (ctx) => {
    const author = ctx.input.author ?? "agent:product";

    const strategyArtifact = await ctx.artifacts.get(ctx.input.strategyArtifactId);
    if (!strategyArtifact) {
      throw new Error(`Strategy artifact "${ctx.input.strategyArtifactId}" not found`);
    }
    if (strategyArtifact.metadata.type !== "strategy") {
      throw new Error(
        `Artifact "${ctx.input.strategyArtifactId}" is type "${strategyArtifact.metadata.type}", expected "strategy"`,
      );
    }

    const topic = strategyArtifact.metadata.title.replace(/^Strategy Report:\s*/i, "");
    const problemStatement =
      extractSection(strategyArtifact.content, "Problem Statement") ??
      "Problem statement not found in source strategy.";
    const businessModel =
      extractSection(strategyArtifact.content, "Proposed Business Model") ?? "Not specified.";
    const opportunitySection = extractSection(strategyArtifact.content, "Opportunity Score") ?? "";
    const opportunityScore =
      opportunitySection.replace(/\*\*/g, "").split("/")[0]?.trim() ?? "unknown";

    ctx.logger.info("Deriving PRD from strategy artifact", {
      strategyArtifactId: strategyArtifact.metadata.id,
    });

    const artifact = await ctx.artifacts.create({
      project: ctx.input.project,
      type: "prd",
      title: `PRD: ${topic}`,
      content: renderPrd({ topic, problemStatement, opportunityScore, businessModel }),
      author,
      tags: ["prd", topic],
      status: "draft",
      provenance: {
        generatedBy: {
          agentId: "product",
        },
        inputArtifactIds: [strategyArtifact.metadata.id],
        frameworkVersion: BUSINESS_OS_VERSION,
        createdAt: Date.now(),
      },
    });

    await ctx.artifacts.linkRelationship(
      strategyArtifact.metadata.id,
      artifact.metadata.id,
      "generated",
    );

    ctx.logger.info("PRD complete", { artifactId: artifact.metadata.id });

    return { artifactId: artifact.metadata.id };
  },
});
