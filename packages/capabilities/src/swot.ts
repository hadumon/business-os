import { defineCapability } from "@business-os/capability-core";
import type { SwotAnalysis, Competitor, MarketSignal } from "./types.js";

export interface SwotInput {
  topic: string;
  signals: MarketSignal[];
  competitors: Competitor[];
}

export const swotCapability = defineCapability<SwotInput, SwotAnalysis>({
  id: "swot",
  description: "Derives a SWOT analysis from market signals and competitor data.",
  run: (ctx, input) => {
    const strongSignals = input.signals.filter((s) => s.strength > 0.6);
    const weakCompetitors = input.competitors.filter((c) => c.strength < 0.5);

    const swot: SwotAnalysis = {
      strengths: [
        `Clear demand signal in ${strongSignals.length} of ${input.signals.length} tracked indicators`,
      ],
      weaknesses: ["No existing product or brand presence"],
      opportunities: weakCompetitors.map(
        (c) => `${c.name} shows exploitable weaknesses: ${c.notes}`,
      ),
      threats: input.competitors
        .filter((c) => c.strength >= 0.6)
        .map((c) => `${c.name} has strong market presence (${Math.round(c.strength * 100)}%)`),
    };

    ctx.logger.debug("SWOT complete", { topic: input.topic });
    return swot;
  },
});
