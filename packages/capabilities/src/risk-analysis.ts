import { defineCapability } from "@business-os/capability-core";
import type { RiskAnalysis, Competitor } from "./types.js";

export interface RiskAnalysisInput {
  competitors: Competitor[];
  opportunityScore: number;
}

export const riskAnalysisCapability = defineCapability<RiskAnalysisInput, RiskAnalysis>({
  id: "risk-analysis",
  description: "Identifies key risks given competitive landscape and opportunity strength.",
  run: (ctx, input) => {
    const risks = [
      { label: "Market timing", severity: input.opportunityScore > 70 ? "low" : "medium" } as const,
      {
        label: "Competitive response",
        severity: input.competitors.length > 2 ? "high" : "medium",
      } as const,
      { label: "Execution complexity", severity: "medium" } as const,
    ];
    ctx.logger.debug("Risk analysis complete", { riskCount: risks.length });
    return { risks };
  },
});
