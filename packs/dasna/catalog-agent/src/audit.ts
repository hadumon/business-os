import type { Product } from "@dasna/catalog";

export interface DataGap {
    field: string;
    issue: string;
}

export function auditProduct(product: Product): DataGap[] {
    const gaps: DataGap[] = [];

    if (!product.name || product.name.trim().length < 5) {
        gaps.push({ field: "name", issue: "missing or too short" });
    }
    if (product.type !== "accessory" && !product.firmness) {
        gaps.push({ field: "firmness", issue: "missing (expected for non-accessory products)" });
    }
    if (product.goodFor.length === 0) {
        gaps.push({ field: "goodFor", issue: "no use-case tags — hurts search matching and SEO" });
    }
    if (!product.price || product.price <= 0) {
        gaps.push({ field: "price", issue: "missing or invalid" });
    }
    if (!product.warrantyYears || product.warrantyYears <= 0) {
        gaps.push({ field: "warrantyYears", issue: "missing or zero — customers ask about this often" });
    }
    if (!product.size) {
        gaps.push({ field: "size", issue: "missing" });
    }

    return gaps;
}