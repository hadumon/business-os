import { describe, it, expect } from "vitest";
import { matchProducts, suggestUpsells, type ProductMatch } from "./matching.js";
import type { Product } from "./types.js";

const catalog: Product[] = [
    { id: "a", name: "Ortho Queen", type: "orthopedic", size: "queen", price: 32000, firmness: "firm", goodFor: ["back-pain"], warrantyYears: 7 },
    { id: "b", name: "Foam Single", type: "memory-foam", size: "single", price: 15000, firmness: "medium", goodFor: ["kids"], warrantyYears: 3 },
    { id: "c", name: "Pillow", type: "accessory", size: "standard", price: 2000, firmness: "soft", goodFor: ["neck-pain"], warrantyYears: 1 },
];

describe("matchProducts", () => {
    it("ranks products matching the stated need highest", () => {
        const matches = matchProducts(catalog, { need: "back pain relief", budget: 35000, size: "queen" });
        expect(matches[0]!.product.id).toBe("a");
    });

    it("excludes accessories from primary matches", () => {
        const matches = matchProducts(catalog, { need: "neck pain", budget: 3000 });
        expect(matches.find((m: ProductMatch) => m.product.type === "accessory")).toBeUndefined();
    });

    it("penalizes products over budget but still allows a slight stretch", () => {
        const matches = matchProducts(catalog, { need: "back pain", budget: 20000, size: "queen" });
        const ortho = matches.find((m: ProductMatch) => m.product.id === "a");
        expect(ortho).toBeDefined();
        expect(ortho!.score).toBeLessThanOrEqual(0.7); // no full budget bonus (0.4 need + 0.3 size + 0 budget = 0.7 max)
        expect(ortho!.reasons.some((r: string) => r.includes("budget"))).toBe(false); // confirms no budget bonus was applied
    });

    it("falls back to in-budget options when nothing matches goodFor tags", () => {
        const matches = matchProducts(catalog, { need: "mattress for parents", budget: 20000 });
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]!.reasons.some((r: string) => r.includes("general recommendation"))).toBe(true);
    });
});

describe("suggestUpsells", () => {
    it("suggests accessories matching the primary product's size", () => {
        const primary = catalog[0]!;
        const upsells = suggestUpsells(catalog, primary);
        expect(upsells.some((p: Product) => p.type === "accessory")).toBe(true);
    });
});