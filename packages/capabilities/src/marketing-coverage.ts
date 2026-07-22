import { defineCapability } from "@business-os/capability-core";

export interface MarketingCoverageInput {
  productIds: string[];
  productNames: Record<string, string>;
  /** Raw text content of marketing artifacts, most recent last is not assumed - all scanned. */
  campaignContents: string[];
}

export interface MarketingCoverageResult {
  productId: string;
  productName: string;
  campaignMentions: number;
  covered: boolean;
}

export const marketingCoverageCapability = defineCapability<MarketingCoverageInput, MarketingCoverageResult[]>({
  id: "marketing-coverage",
  description: "Counts how often each product has been referenced across marketing campaign artifacts.",
  run: (ctx, input) => {
    const results = input.productIds.map((productId) => {
      const name = input.productNames[productId] ?? productId;
      const mentions = input.campaignContents.filter((content) => content.includes(name)).length;
      return {
        productId,
        productName: name,
        campaignMentions: mentions,
        covered: mentions > 0,
      };
    });
    ctx.logger.debug("Marketing coverage computed", {
      uncovered: results.filter((r) => !r.covered).length,
    });
    return results;
  },
});
