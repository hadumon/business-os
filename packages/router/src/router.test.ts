import { describe, it, expect } from "vitest";
import { Router } from "./router.js";
import { KeywordIntentDetector } from "./keyword-intent-detector.js";
import type { AgentDefinition } from "@business-os/core";

const mockAgent = (id: string): AgentDefinition => ({
  id,
  execute: async () => ({ success: true }),
});

describe("Router", () => {
  it("routes input to the correct agent based on keyword match", async () => {
    const detector = new KeywordIntentDetector([
      { intent: "seo", keywords: ["seo", "search ranking", "google ranking"] },
      { intent: "marketing", keywords: ["landing page", "conversion", "ads"] },
    ]);
    const router = new Router(detector);

    router.registerAgent(mockAgent("seo-agent"), ["seo"]);
    router.registerAgent(mockAgent("marketing-agent"), ["marketing"]);

    const intent = await router.route("My landing page converts poorly.");
    expect(intent.detectedIntent).toBe("marketing");

    const plan = await router.plan(intent);
    expect(plan.agents).toContain("marketing-agent");
  });

  it("returns empty plan when no intent matches", async () => {
    const detector = new KeywordIntentDetector([{ intent: "seo", keywords: ["seo"] }]);
    const router = new Router(detector);
    router.registerAgent(mockAgent("seo-agent"), ["seo"]);

    const intent = await router.route("What's the weather today?");
    expect(intent.detectedIntent).toBeUndefined();

    const plan = await router.plan(intent);
    expect(plan.agents).toEqual([]);
  });

  it("supports multiple agents bound to the same intent", async () => {
    const detector = new KeywordIntentDetector([
      { intent: "growth", keywords: ["growth", "users"] },
    ]);
    const router = new Router(detector);

    router.registerAgent(mockAgent("seo-agent"), ["growth"]);
    router.registerAgent(mockAgent("content-agent"), ["growth"]);

    const intent = await router.route("How do we drive growth?");
    const plan = await router.plan(intent);

    expect(plan.agents).toEqual(["seo-agent", "content-agent"]);
  });
});
