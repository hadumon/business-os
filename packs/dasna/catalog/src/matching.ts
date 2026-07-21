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

    return matches;
}

export function suggestUpsells(catalog: Product[], primaryProduct: Product): Product[] {
    return catalog.filter(
        (p) => p.type === "accessory" && (p.size === primaryProduct.size || p.size === "standard")
    );
}