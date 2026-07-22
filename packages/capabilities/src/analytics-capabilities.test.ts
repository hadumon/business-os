import { describe, it, expect } from "vitest";
import type { CapabilityContext } from "@business-os/capability-core";
import { salesPerformanceCapability } from "./sales-performance.js";
import { marketingCoverageCapability } from "./marketing-coverage.js";
import { supportVolumeCapability } from "./support-volume.js";
import { crossRecommendationsCapability } from "./cross-recommendations.js";

const testCtx: CapabilityContext = {
  memory: { read: async () => null, write: async () => ({} as never), query: async () => [], delete: async () => {} },
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};

describe("salesPerformanceCapability", () => {
  it("ranks by revenue and flags top-sellers", async () => {
    const results = await salesPerformanceCapability.run(testCtx, {
      items: [
        { productId: "a", productName: "A", price: 1000, weeklyUnitsSold: 10 },
        { productId: "b", productName: "B", price: 1000, weeklyUnitsSold: 1 },
      ],
    });
    expect(results[0]!.productId).toBe("a");
    expect(results[0]!.segment).toBe("top-seller");
  });
});

describe("marketingCoverageCapability", () => {
  it("detects products with zero campaign mentions", async () => {
    const results = await marketingCoverageCapability.run(testCtx, {
      productIds: ["a", "b"],
      productNames: { a: "Product A", b: "Product B" },
      campaignContents: ["Check out Product A this season!"],
    });
    const b = results.find((r) => r.productId === "b");
    expect(b!.covered).toBe(false);
  });
});

describe("supportVolumeCapability", () => {
  it("counts questions per product and per topic", async () => {
    const result = await supportVolumeCapability.run(testCtx, {
      productIds: ["a"],
      productNames: { a: "Product A" },
      replyContents: ["Question about Product A warranty", "Delivery question"],
      topics: ["warranty", "delivery"],
    });
    expect(result.byProduct[0]!.questionCount).toBe(1);
    expect(result.byTopic.length).toBe(2);
  });
});

describe("crossRecommendationsCapability", () => {
  it("flags a top seller with critical stock", async () => {
    const insights = await crossRecommendationsCapability.run(testCtx, {
      signals: [
        {
          productId: "a",
          productName: "A",
          salesSegment: "top-seller",
          stockStatus: "critical",
          marketingCovered: true,
          supportQuestionCount: 0,
        },
      ],
    });
    expect(insights.some((i) => i.title.includes("critically low"))).toBe(true);
  });

  it("flags high support volume paired with low sales", async () => {
    const insights = await crossRecommendationsCapability.run(testCtx, {
      signals: [
        {
          productId: "a",
          productName: "A",
          salesSegment: "slow-mover",
          stockStatus: "healthy",
          marketingCovered: false,
          supportQuestionCount: 3,
        },
      ],
    });
    expect(insights.some((i) => i.title.includes("support questions"))).toBe(true);
  });
});
