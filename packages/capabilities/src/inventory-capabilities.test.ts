import { describe, it, expect } from "vitest";
import type { CapabilityContext } from "@business-os/capability-core";
import { stockHealthCapability } from "./stock-health.js";
import { fastMovingProductsCapability } from "./fast-moving-products.js";
import { reorderRecommendationCapability } from "./reorder-recommendation.js";

const testCtx: CapabilityContext = {
  memory: { read: async () => null, write: async () => ({} as never), query: async () => [], delete: async () => {} },
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};

describe("stockHealthCapability", () => {
  it("classifies stock below half-threshold as critical", async () => {
    const results = await stockHealthCapability.run(testCtx, {
      items: [{ productId: "a", productName: "A", stock: 2, threshold: 5 }],
    });
    expect(results[0]!.status).toBe("critical");
  });

  it("classifies stock above threshold as healthy", async () => {
    const results = await stockHealthCapability.run(testCtx, {
      items: [{ productId: "a", productName: "A", stock: 20, threshold: 5 }],
    });
    expect(results[0]!.status).toBe("healthy");
  });
});

describe("fastMovingProductsCapability", () => {
  it("ranks products by weekly sales, fastest first", async () => {
    const results = await fastMovingProductsCapability.run(testCtx, {
      items: [
        { productId: "a", productName: "A", weeklyAvgSales: 3 },
        { productId: "b", productName: "B", weeklyAvgSales: 8 },
      ],
    });
    expect(results[0]!.productId).toBe("b");
    expect(results[0]!.rank).toBe(1);
  });

  it("respects the top limit", async () => {
    const results = await fastMovingProductsCapability.run(testCtx, {
      items: [
        { productId: "a", productName: "A", weeklyAvgSales: 3 },
        { productId: "b", productName: "B", weeklyAvgSales: 8 },
        { productId: "c", productName: "C", weeklyAvgSales: 1 },
      ],
      top: 2,
    });
    expect(results.length).toBe(2);
  });
});

describe("reorderRecommendationCapability", () => {
  it("recommends reordering now when stock runs out before lead time", async () => {
    const results = await reorderRecommendationCapability.run(testCtx, {
      items: [{ productId: "a", productName: "A", stock: 4, weeklyAvgSales: 2, leadTimeDays: 21 }],
    });
    // 4/2 = 2 weeks left, lead time = 3 weeks -> reorderScore = -1 -> reorder now
    expect(results[0]!.recommendation).toBe("reorder now");
  });

  it("recommends monitor when there's ample buffer", async () => {
    const results = await reorderRecommendationCapability.run(testCtx, {
      items: [{ productId: "a", productName: "A", stock: 50, weeklyAvgSales: 1, leadTimeDays: 7 }],
    });
    expect(results[0]!.recommendation).toBe("monitor");
  });

  it("handles zero sales velocity without dividing by zero", async () => {
    const results = await reorderRecommendationCapability.run(testCtx, {
      items: [{ productId: "a", productName: "A", stock: 10, weeklyAvgSales: 0, leadTimeDays: 7 }],
    });
    expect(results[0]!.weeksOfStockLeft).toBeNull();
    expect(results[0]!.recommendation).toBe("monitor");
  });
});
