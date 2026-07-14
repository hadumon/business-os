import { describe, it, expect } from "vitest";
import type { CapabilityContext } from "@business-os/capability-core";
import { marketResearchCapability } from "./market-research.js";
import { competitorAnalysisCapability } from "./competitor-analysis.js";
import { demandValidationCapability } from "./demand-validation.js";
import { scoringCapability } from "./scoring.js";
import { swotCapability } from "./swot.js";
import { pricingCapability } from "./pricing.js";
import { riskAnalysisCapability } from "./risk-analysis.js";

const testCtx: CapabilityContext = {
  memory: {
    read: async () => null,
    write: async () => ({}) as never,
    query: async () => [],
    delete: async () => {},
  },
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
};

describe("capabilities", () => {
  it("market-research returns signals and a problem statement", async () => {
    const result = await marketResearchCapability.run(testCtx, { topic: "ai meeting notes" });
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.problemStatement).toContain("ai meeting notes");
  });

  it("competitor-analysis returns at least one competitor", async () => {
    const result = await competitorAnalysisCapability.run(testCtx, { topic: "crm" });
    expect(result.competitors.length).toBeGreaterThan(0);
  });

  it("demand-validation combines signals and competitors into a 0-100 score", async () => {
    const result = await demandValidationCapability.run(testCtx, {
      signals: [{ label: "x", strength: 0.8 }],
      competitors: [{ name: "y", strength: 0.3, notes: "" }],
    });
    expect(result.demandScore).toBeGreaterThanOrEqual(0);
    expect(result.demandScore).toBeLessThanOrEqual(100);
  });

  it("opportunity-scoring penalizes higher competitor counts", async () => {
    const few = await scoringCapability.run(testCtx, { demandScore: 80, competitorCount: 1 });
    const many = await scoringCapability.run(testCtx, { demandScore: 80, competitorCount: 5 });
    expect(few.score).toBeGreaterThanOrEqual(many.score);
  });

  it("swot produces all four quadrants", async () => {
    const result = await swotCapability.run(testCtx, {
      topic: "x",
      signals: [{ label: "a", strength: 0.7 }],
      competitors: [{ name: "b", strength: 0.3, notes: "weak" }],
    });
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(Array.isArray(result.opportunities)).toBe(true);
    expect(Array.isArray(result.threats)).toBe(true);
  });

  it("pricing recommends subscription for high opportunity scores", async () => {
    const result = await pricingCapability.run(testCtx, { topic: "x", opportunityScore: 80 });
    expect(result.model).toBe("Subscription SaaS");
  });

  it("risk-analysis flags high competitive response risk with many competitors", async () => {
    const result = await riskAnalysisCapability.run(testCtx, {
      competitors: [
        { name: "a", strength: 0.5, notes: "" },
        { name: "b", strength: 0.5, notes: "" },
        { name: "c", strength: 0.5, notes: "" },
      ],
      opportunityScore: 50,
    });
    const competitiveRisk = result.risks.find((r) => r.label === "Competitive response");
    expect(competitiveRisk?.severity).toBe("high");
  });
});
