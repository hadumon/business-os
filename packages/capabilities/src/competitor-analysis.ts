import { defineCapability } from "@business-os/capability-core";
import type { CompetitorAnalysis } from "./types.js";

export interface CompetitorAnalysisInput {
  topic: string;
}

export const competitorAnalysisCapability = defineCapability<
  CompetitorAnalysisInput,
  CompetitorAnalysis
>({
  id: "competitor-analysis",
  description: "Identifies competitors and their relative market strength.",
  run: async (ctx, input) => {
    ctx.logger.debug("Running competitor analysis", { topic: input.topic });

    return {
      competitors: [
        { name: `${input.topic} Inc.`, strength: 0.7, notes: "Established player, weak in UX" },
        {
          name: `Open${input.topic.replace(/\s+/g, "")}`,
          strength: 0.4,
          notes: "Open-source alternative, limited support",
        },
      ],
    };
  },
});
