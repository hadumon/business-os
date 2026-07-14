import { Workflow } from "@business-os/workflow";
import type { WorkflowNodeDefinition } from "@business-os/workflow";
import type { DiscoverPipelineState } from "./types.js";
import * as analyzers from "./analyzers.js";

export function buildDiscoverPipeline(runId: string): Workflow {
  const nodes: WorkflowNodeDefinition[] = [
    {
      id: "market-scan",
      retry: { maxAttempts: 2, backoffMs: 250 },
      run: async (state: DiscoverPipelineState) => {
        const signals = await analyzers.scanMarket(state.topic);
        return { ...state, signals };
      },
    },
    {
      id: "problem-discovery",
      run: async (state: DiscoverPipelineState) => {
        const { problemStatement, painPoints } = await analyzers.discoverProblem(
          state.topic,
          state.signals!,
        );
        return { ...state, problemStatement, painPoints };
      },
    },
    {
      id: "competitor-analysis",
      retry: { maxAttempts: 2, backoffMs: 250 },
      run: async (state: DiscoverPipelineState) => {
        const competitors = await analyzers.analyzeCompetitors(state.topic);
        return { ...state, competitors };
      },
    },
    {
      id: "demand-validation",
      run: async (state: DiscoverPipelineState) => {
        const demandScore = await analyzers.validateDemand(state.signals!, state.competitors!);
        return { ...state, demandScore };
      },
    },
    {
      id: "opportunity-score",
      run: async (state: DiscoverPipelineState) => {
        const opportunityScore = analyzers.scoreOpportunity(
          state.demandScore!,
          state.competitors!.length,
        );
        return { ...state, opportunityScore };
      },
    },
    {
      id: "business-model",
      run: async (state: DiscoverPipelineState) => {
        const businessModel = await analyzers.proposeBusinessModel(
          state.topic,
          state.opportunityScore!,
        );
        return { ...state, businessModel };
      },
    },
    {
      id: "risk-analysis",
      run: async (state: DiscoverPipelineState) => {
        const risks = await analyzers.analyzeRisks(state.competitors!, state.opportunityScore!);
        return { ...state, risks };
      },
    },
    {
      id: "recommendation",
      run: async (state: DiscoverPipelineState) => {
        const recommendation = analyzers.buildRecommendation(
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
