import { defineCapability } from "@business-os/capability-core";

export interface SalesPerformanceItem {
  productId: string;
  productName: string;
  price: number;
  weeklyUnitsSold: number;
}

export interface SalesPerformanceResult {
  productId: string;
  productName: string;
  weeklyRevenue: number;
  revenueShare: number; // 0-1
  rank: number;
  segment: "top-seller" | "steady" | "slow-mover";
}

export interface SalesPerformanceInput {
  items: SalesPerformanceItem[];
}

export const salesPerformanceCapability = defineCapability<SalesPerformanceInput, SalesPerformanceResult[]>({
  id: "sales-performance",
  description: "Ranks products by revenue contribution using price x weekly units sold as a proxy for sales.",
  run: (ctx, input) => {
    const withRevenue = input.items.map((item) => ({
      ...item,
      weeklyRevenue: item.price * item.weeklyUnitsSold,
    }));
    const totalRevenue = withRevenue.reduce((sum, i) => sum + i.weeklyRevenue, 0) || 1;
    const sorted = [...withRevenue].sort((a, b) => b.weeklyRevenue - a.weeklyRevenue);

    const results = sorted.map((item, i) => {
      const revenueShare = item.weeklyRevenue / totalRevenue;
      let segment: SalesPerformanceResult["segment"] = "steady";
      if (i === 0 || revenueShare >= 0.25) segment = "top-seller";
      else if (item.weeklyUnitsSold <= 1) segment = "slow-mover";

      return {
        productId: item.productId,
        productName: item.productName,
        weeklyRevenue: Math.round(item.weeklyRevenue),
        revenueShare: Math.round(revenueShare * 1000) / 1000,
        rank: i + 1,
        segment,
      };
    });

    ctx.logger.debug("Sales performance computed", { totalRevenue: Math.round(totalRevenue) });
    return results;
  },
});
