import type { Product } from "./types.js";

export interface CustomerNeed {
    need: string; // free-text, e.g. "back pain", "guest room", "hot sleeper"
    budget: number;
    size?: string; // e.g. "queen", "king", "single"
}

export interface ProductMatch {
    product: Product;
    score: number; // 0-1
    reasons: string[];
}

export function matchProducts(catalog: Product[], need: CustomerNeed): ProductMatch[] {
    const needKeywords = need.need.toLowerCase();

    const matches: ProductMatch[] = catalog
        .filter((p) => p.type !== "accessory") // main recommendation pass excludes accessories
        .map((product) => {
            let score = 0;
            const reasons: string[] = [];

            const goodForMatch = product.goodFor.some((tag: string) => needKeywords.includes(tag.replace("-", " ")));
            if (goodForMatch) {
                score += 0.4;
                reasons.push(`matches stated need: ${need.need}`);
            }

            if (need.size && product.size === need.size) {
                score += 0.3;
                reasons.push(`correct size: ${need.size}`);
            }

            const withinBudget = product.price <= need.budget;
            const closeToBudget = product.price <= need.budget * 1.15; // allow slight stretch
            if (withinBudget) {
                score += 0.3;
                reasons.push(`within budget (Rs. ${product.price})`);
            } else if (closeToBudget) {
                score += 0.1;
                reasons.push(`slightly above budget (Rs. ${product.price}), worth considering`);
            }

            return { product, score, reasons };
        })
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score);

    // If any product matched a tag or size (score > 0.3), return the regular matches.
    if (matches.some(m => m.score > 0.3)) return matches;

    // Fallback: no tag/size match found. Rather than return nothing, surface
    // the best in-budget options so the customer still gets a useful answer.
    const budgetOnly = catalog
        .filter((p) => p.type !== "accessory" && p.price <= need.budget)
        .map((product) => ({
            product,
            score: 0.2,
            reasons: [`within budget (Rs. ${product.price})`, "general recommendation - no exact match found for your specific need"],
        }))
        .sort((a, b) => a.product.price - b.product.price);

    return budgetOnly;
}

export function suggestUpsells(catalog: Product[], primaryProduct: Product): Product[] {
    return catalog.filter(
        (p) => p.type === "accessory" && (p.size === primaryProduct.size || p.size === "standard")
    );
}