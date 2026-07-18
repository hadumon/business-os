import { describe, it, expect } from "vitest";
import { generateGeneralCaptions, generateProductCaption } from "./generate-captions.js";
import { getCampaignPreset } from "./campaigns.js";
import type { Product } from "@dasna/catalog";

const campaign = getCampaignPreset("dashain");
const product: Product = {
    id: "mat-memory-queen", name: "Dasna ComfortFoam Memory Mattress - Queen",
    type: "memory-foam", size: "queen", price: 28000, firmness: "medium",
    goodFor: ["back-pain", "side-sleeper"], warrantyYears: 5,
};

describe("generateGeneralCaptions", () => {
    it("produces captions for both platforms", () => {
        const captions = generateGeneralCaptions(campaign);
        expect(captions.some((c) => c.platform === "facebook")).toBe(true);
        expect(captions.some((c) => c.platform === "instagram")).toBe(true);
    });

    it("includes the campaign name in every caption", () => {
        const captions = generateGeneralCaptions(campaign);
        for (const c of captions) expect(c.text).toContain("Dashain");
    });
});

describe("generateProductCaption", () => {
    it("includes product name and price", () => {
        const caption = generateProductCaption(product, campaign);
        expect(caption.text).toContain(product.name);
        expect(caption.text).toContain("28,000");
    });

    it("phrases use-cases as natural language, not a raw tag list", () => {
        const caption = generateProductCaption(product, campaign);
        expect(caption.text).toContain("people with back pain and side sleepers");
    });
});