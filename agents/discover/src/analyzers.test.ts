import { describe, it, expect } from "vitest";
import * as analyzers from "./analyzers.js";

describe("discover analyzers", () => {
  it("scanMarket returns signals with strength between 0 and 1", async () => {
    const signals = await analyzers.scanMarket("ai note taking");
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) {
      expect(s.strength).toBeGreaterThanOrEqual(0);
      expect(s.strength).toBeLessThanOrEqual(1);
    }
  });

  it("scoreOpportunity penalizes higher competitor counts", () => {
    const fewCompetitors = analyzers.scoreOpportunity(80, 1);
    const manyCompetitors = analyzers.scoreOpportunity(80, 5);
    expect(fewCompetitors).toBeGreaterThanOrEqual(manyCompetitors);
  });

  it("buildRecommendation recommends proceeding on high score with no high risks", () => {
    const rec = analyzers.buildRecommendation("test topic", 85, [{ label: "x", severity: "low" }]);
    expect(rec).toContain("Proceed");
  });

  it("buildRecommendation recommends deprioritizing on low score", () => {
    const rec = analyzers.buildRecommendation("test topic", 20, []);
    expect(rec).toContain("Deprioritize");
  });
});
