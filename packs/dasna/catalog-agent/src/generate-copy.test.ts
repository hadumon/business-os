import { describe, it, expect } from "vitest";
import { generateCopy } from "./generate-copy.js";
import type { Product } from "@dasna/catalog";

const product: Product = {
    id: "x", name: "Dasna ComfortFoam Memory Mattress - Queen", type: "memory-foam", size: "queen",
    price: 28000, firmness: "medium", goodFor: ["back-pain", "side-sleeper"], warrantyYears: 5,
};

describe("generateCopy", () => {
    it("includes product name and use cases in the description", () => {
        const copy = generateCopy(product);
        expect(copy.description).toContain("Memory Foam");
        expect(copy.description.toLowerCase()).toContain("back pain");
    });

    it("keeps meta description within 160 characters", () => {
        const copy = generateCopy(product);
        expect(copy.seo.metaDescription.length).toBeLessThanOrEqual(160);
    });

    it("includes size and use-case tags in keywords", () => {
        const copy = generateCopy(product);
        expect(copy.seo.keywords).toContain("queen");
        expect(copy.seo.keywords.some((k) => k.includes("back pain"))).toBe(true);
    });

    it("phrases use-cases as natural language, not a raw tag list", () => {
        const copy = generateCopy(product);
        expect(copy.description).toContain("Ideal for people with back pain and side sleepers");
    });
});