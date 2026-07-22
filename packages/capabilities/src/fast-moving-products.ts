import { defineCapability } from "@business-os/capability-core";

export interface SalesVelocityItem {
  productId: string;
  productName: string;
  weeklyAvgSales: number;
}

export interface FastMovingResult {
  productId: string;
  productName: string;
  weeklyAvgSales: number;
  rank: number;
}

export interface FastMovingInput {
  items: SalesVelocityItem[];
  top?: number;
}

export const fastMovingProductsCapability = defineCapability<FastMovingInput, FastMovingResult[]>({
  id: "fast-moving-products",
  description: "Ranks products by sales velocity, fastest-selling first.",
  run: (ctx, input) => {
    const sorted = [...input.items].sort((a, b) => b.weeklyAvgSales - a.weeklyAvgSales);
    const top = input.top ?? sorted.length;
    const results = sorted.slice(0, top).map((item, i) => ({ ...item, rank: i + 1 }));
    ctx.logger.debug("Fast-moving products ranked", { count: results.length });
    return results;
  },
});
