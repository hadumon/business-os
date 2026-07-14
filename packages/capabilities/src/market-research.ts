import { defineCapability } from "@business-os/capability-core";
import type { MarketResearch, MarketSignal } from "./types.js";

export interface MarketResearchInput {
  topic: string;
}

export const marketResearchCapability = defineCapability<MarketResearchInput, MarketResearch>({
  id: "market-research",
  description: "Scans market signals and articulates the underlying problem and pain points.",
  run: async (ctx, input) => {
    ctx.logger.debug("Running market research", { topic: input.topic });

    const words = input.topic.toLowerCase().split(/\s+/).filter(Boolean);
    const signals: MarketSignal[] = [
      {
        label: `${input.topic} search interest`,
        strength: Math.min(0.9, 0.4 + words.length * 0.1),
      },
      { label: `${input.topic} funding activity`, strength: 0.5 },
      { label: `${input.topic} community discussion volume`, strength: 0.6 },
    ];

    const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;

    return {
      topic: input.topic,
      signals,
      problemStatement: `Users researching "${input.topic}" show ${
        avgStrength > 0.6 ? "strong" : "moderate"
      } unmet need signals across ${signals.length} tracked indicators.`,
      painPoints: [
        `Existing solutions for "${input.topic}" are fragmented`,
        `Users report friction in current workflows`,
        `Pricing models don't match usage patterns`,
      ],
    };
  },
});
