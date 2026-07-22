import type { PipelineDefinition } from "@business-os/workflow";
import type { AgentResult } from "@business-os/core";

function extractArtifactId(result: AgentResult): string | undefined {
  if (result.success && result.output && typeof result.output === "object" && "artifactId" in result.output) {
    return (result.output as { artifactId: string }).artifactId;
  }
  return undefined;
}

export const marketToPrdPipeline: PipelineDefinition = {
  id: "market-to-prd",
  description: "Market research to PRD pipeline: Discover -> Strategy -> Product",
  steps: [
    {
      agentId: "discover",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
        topic: pInput["topic"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "strategy",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>, artifacts: Record<string, string>) => ({
        project: pInput["project"],
        topic: pInput["topic"],
        sourceArtifactId: artifacts["discover"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "product",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>, artifacts: Record<string, string>) => ({
        project: pInput["project"],
        strategyArtifactId: artifacts["strategy"],
      }),
      artifactExtractor: extractArtifactId,
    },
  ],
};

export const operationsPipeline: PipelineDefinition = {
  id: "operations",
  description: "Operational analysis pipeline: Catalog -> Inventory -> Analytics",
  steps: [
    {
      agentId: "catalog",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "inventory",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "analytics",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
  ],
};

export const fullCyclePipeline: PipelineDefinition = {
  id: "full-cycle",
  description: "End-to-end business cycle: Discover -> Strategy -> Product -> Catalog -> Inventory -> Analytics",
  steps: [
    {
      agentId: "discover",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
        topic: pInput["topic"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "strategy",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>, artifacts: Record<string, string>) => ({
        project: pInput["project"],
        topic: pInput["topic"],
        sourceArtifactId: artifacts["discover"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "product",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>, artifacts: Record<string, string>) => ({
        project: pInput["project"],
        strategyArtifactId: artifacts["strategy"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "catalog",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "inventory",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
    {
      agentId: "analytics",
      inputBuilder: (_prev: AgentResult | undefined, pInput: Record<string, unknown>) => ({
        project: pInput["project"],
      }),
      artifactExtractor: extractArtifactId,
    },
  ],
};

export const DASNA_PIPELINES: Record<string, PipelineDefinition> = {
  "market-to-prd": marketToPrdPipeline,
  operations: operationsPipeline,
  "full-cycle": fullCyclePipeline,
};
