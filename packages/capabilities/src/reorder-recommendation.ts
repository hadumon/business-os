import { defineCapability } from "@business-os/capability-core";

export interface ReorderInput {
  items: {
    productId: string;
    productName: string;
    stock: number;
    weeklyAvgSales: number;
    leadTimeDays: number;
  }[];
}

export interface ReorderResult {
  productId: string;
  productName: string;
  weeksOfStockLeft: number | null; // null when weeklyAvgSales is 0 (can't divide)
  reorderScore: number; // lower = more urgent
  recommendation: "reorder now" | "reorder soon" | "monitor";
}

export const reorderRecommendationCapability = defineCapability<ReorderInput, ReorderResult[]>({
  id: "reorder-recommendation",
  description:
    "Scores reorder urgency using weeks-of-stock-remaining relative to supplier lead time.",
  run: (ctx, input) => {
    const results = input.items.map((item) => {
      const weeksOfStockLeft = item.weeklyAvgSales > 0 ? item.stock / item.weeklyAvgSales : null;
      const leadTimeWeeks = item.leadTimeDays / 7;

      // reorderScore: how many weeks of buffer remain after the supplier lead time is accounted for.
      // Negative or near-zero means stock will run out before a reorder can arrive.
      const reorderScore = weeksOfStockLeft === null ? Infinity : weeksOfStockLeft - leadTimeWeeks;

      let recommendation: ReorderResult["recommendation"];
      if (reorderScore <= 0) recommendation = "reorder now";
      else if (reorderScore <= 1) recommendation = "reorder soon";
      else recommendation = "monitor";

      return {
        productId: item.productId,
        productName: item.productName,
        weeksOfStockLeft: weeksOfStockLeft === null ? null : Math.round(weeksOfStockLeft * 10) / 10,
        reorderScore: reorderScore === Infinity ? Infinity : Math.round(reorderScore * 10) / 10,
        recommendation,
      };
    });
    ctx.logger.debug("Reorder recommendations computed", {
      urgent: results.filter((r) => r.recommendation === "reorder now").length,
    });
    return results;
  },
});
