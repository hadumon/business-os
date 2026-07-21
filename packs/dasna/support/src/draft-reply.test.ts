import { describe, it, expect } from "vitest";
import { draftReply } from "./draft-reply.js";
import type { Policies, Product } from "@dasna/catalog";

const policies: Policies = {
    warranty: { summary: "5-year warranty on most products.", exclusions: "Stains not covered." },
    delivery: { summary: "2-3 days in Kathmandu." },
};
const catalog: Product[] = [
  { id: "x", name: "Test Queen", type: "memory-foam", size: "queen", price: 20000, firmness: "medium", goodFor: ["back-pain"], warrantyYears: 5 },
];

describe("draftReply", () => {
    it("drafts a policy-based reply including exclusions", () => {
        const result = draftReply("what's the warranty", "warranty", policies, catalog);
        expect(result.reply).toContain("5-year warranty");
        expect(result.reply).toContain("Stains not covered");
    });

    it("drafts a product reply recommending a matched product, without leaking internal reason text", () => {
        const result = draftReply("which mattress is good for back pain", "product", policies, catalog);
        expect(result.reply).toContain("Test Queen");
        expect(result.reply).not.toContain("matches stated need");
        expect(result.reply).not.toContain("within budget");
        expect(result.sourcedFrom).toContain("product:matched");
    });

    it("drafts a clarifying fallback for unknown topics", () => {
        const result = draftReply("random question", "unknown", policies, catalog);
        expect(result.sourcedFrom).toBe("fallback");
    });
});