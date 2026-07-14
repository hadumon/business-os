import { Workflow } from "@business-os/workflow";
import type { WorkflowNodeDefinition } from "@business-os/workflow";
import {
  marketResearchCapability,
  competitorAnalysisCapability,
  demandValidationCapability,
  scoringCapability,
  pricingCapability,
  riskAnalysisCapability,
} from "@business-os/capabilities";
import type { CapabilityContext } from "@business-os/capability-core";
import type { DiscoverPipelineState } from "./types.js";

function buildRecommendation(
  topic: string,
  opportunityScore: number,
  risks: { label: string; severity: string }[],
): string {
  const highRisks = risks.filter((r) => r.severity === "high");
  if (opportunityScore >= 70 && highRisks.length === 0) {
    return `Proceed: "${topic}" shows a strong opportunity (score ${opportunityScore}) with manageable risk.`;
  }
  if (opportunityScore >= 40) {
    return `Investigate further: "${topic}" shows moderate opportunity (score ${opportunityScore}). Address ${
      highRisks.map((r) => r.label).join(", ") || "identified risks"
    } before committing.`;
  }
  return `Deprioritize: "${topic}" shows weak opportunity signals (score ${opportunityScore}) relative to competitive and market risk.`;
}

export function buildDiscoverPipeline(runId: string, capCtx: CapabilityContext): Workflow {
  const nodes: WorkflowNodeDefinition[] = [
    {
      id: "market-scan",
      retry: { maxAttempts: 2, backoffMs: 250 },
      run: async (state: DiscoverPipelineState) => {
        const research = await marketResearchCapability.run(capCtx, { topic: state.topic });
        return {
          ...state,
          signals: research.signals,
          problemStatement: research.problemStatement,
          painPoints: research.painPoints,
        };
      },
    },
    {
      id: "competitor-analysis",
      retry: { maxAttempts: 2, backoffMs: 250 },
      run: async (state: DiscoverPipelineState) => {
        const analysis = await competitorAnalysisCapability.run(capCtx, { topic: state.topic });
        return { ...state, competitors: analysis.competitors };
      },
    },
    {
      id: "demand-validation",
      run: async (state: DiscoverPipelineState) => {
        const validation = await demandValidationCapability.run(capCtx, {
          signals: state.signals!,
          competitors: state.competitors!,
        });
        return { ...state, demandScore: validation.demandScore };
      },
    },
    {
      id: "opportunity-score",
      run: async (state: DiscoverPipelineState) => {
        const scored = await scoringCapability.run(capCtx, {
          demandScore: state.demandScore!,
          competitorCount: state.competitors!.length,
        });
        return { ...state, opportunityScore: scored.score };
      },
    },
    {
      id: "business-model",
      run: async (state: DiscoverPipelineState) => {
        const pricing = await pricingCapability.run(capCtx, {
          topic: state.topic,
          opportunityScore: state.opportunityScore!,
        });
        return { ...state, businessModel: pricing.rationale };
      },
    },
    {
      id: "risk-analysis",
      run: async (state: DiscoverPipelineState) => {
        const riskResult = await riskAnalysisCapability.run(capCtx, {
          competitors: state.competitors!,
          opportunityScore: state.opportunityScore!,
        });
        return { ...state, risks: riskResult.risks };
      },
    },
    {
      id: "recommendation",
      run: async (state: DiscoverPipelineState) => {
        const recommendation = buildRecommendation(
          state.topic,
          state.opportunityScore!,
          state.risks!,
        );
        return { ...state, recommendation };
      },
    },
  ];

  return new Workflow(`discover-${runId}`, nodes);
}
