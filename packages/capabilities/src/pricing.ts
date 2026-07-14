import { defineCapability } from "@business-os/capability-core";
import type { PricingRecommendation } from "./types.js";

export interface PricingInput {
  topic: string;
  opportunityScore: number;
}

export const pricingCapability = defineCapability<PricingInput, PricingRecommendation>({
  id: "pricing",
  description: "Recommends a pricing/business model given opportunity strength.",
  run: (ctx, input) => {
    const model = input.opportunityScore > 60 ? "Subscription SaaS" : "Usage-based / freemium";
    ctx.logger.debug("Pricing recommendation complete", { model });
    return {
      model,
      rationale: `${model} targeting "${input.topic}" buyers, prioritizing fast time-to-value given an opportunity score of ${input.opportunityScore}.`,
    };
  },
});
