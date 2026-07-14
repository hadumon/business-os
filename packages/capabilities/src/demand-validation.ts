import { defineCapability } from "@business-os/capability-core";
import type { DemandValidation, MarketSignal, Competitor } from "./types.js";

export interface DemandValidationInput {
  signals: MarketSignal[];
  competitors: Competitor[];
}

export const demandValidationCapability = defineCapability<DemandValidationInput, DemandValidation>(
  {
    id: "demand-validation",
    description: "Scores demand strength by combining market signals against competitive pressure.",
    run: async (ctx, input) => {
      const signalScore =
        input.signals.reduce((sum, s) => sum + s.strength, 0) / input.signals.length;
      const competitionPenalty =
        input.competitors.reduce((sum, c) => sum + c.strength, 0) / (input.competitors.length || 1);
      const raw = signalScore * 100 - competitionPenalty * 20;
      const demandScore = Math.max(0, Math.min(100, Math.round(raw)));

      ctx.logger.debug("Demand validation complete", { demandScore });
      return { demandScore };
    },
  },
);
