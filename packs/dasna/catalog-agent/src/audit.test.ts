import { describe, it, expect } from "vitest";
import { auditProduct } from "./audit.js";
import type { Product } from "@dasna/catalog";

const complete: Product = {
    id: "x", name: "Test Mattress Queen", type: "memory-foam", size: "queen",
    price: 20000, firmness: "medium", goodFor: ["back-pain"], warrantyYears: 5,
};

describe("auditProduct", () => {
    it("finds no gaps in a complete product", () => {
        expect(auditProduct(complete)).toEqual([]);
    });

    it("flags missing firmness on non-accessory products", () => {
        const gaps = auditProduct({ ...complete, firmness: null });
        expect(gaps.some((g) => g.field === "firmness")).toBe(true);
    });

    it("does not flag missing firmness for accessories", () => {
        const gaps = auditProduct({ ...complete, type: "accessory", firmness: null });
        expect(gaps.some((g) => g.field === "firmness")).toBe(false);
    });

    it("flags empty goodFor tags", () => {
        const gaps = auditProduct({ ...complete, goodFor: [] });
        expect(gaps.some((g) => g.field === "goodFor")).toBe(true);
    });

    it("flags missing warranty", () => {
        const gaps = auditProduct({ ...complete, warrantyYears: 0 });
        expect(gaps.some((g) => g.field === "warrantyYears")).toBe(true);
    });
});