import { defineCapability } from "@business-os/capability-core";
import type { OpportunityScore } from "./types.js";

export interface ScoringInput {
  demandScore: number;
  competitorCount: number;
}

export const scoringCapability = defineCapability<ScoringInput, OpportunityScore>({
  id: "opportunity-scoring",
  description: "Combines demand score and competitive density into a single opportunity score.",
  run: (ctx, input) => {
    const competitionAdjustment = Math.max(0, 15 - input.competitorCount * 5);
    const score = Math.max(
      0,
      Math.min(100, Math.round(input.demandScore * 0.8 + competitionAdjustment)),
    );
    ctx.logger.debug("Opportunity scoring complete", { score });
    return { score };
  },
});
