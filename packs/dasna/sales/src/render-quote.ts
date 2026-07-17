import type { ProductMatch, CustomerNeed } from "./matching.js";
import type { Product } from "@dasna/catalog";

const MIN_DISPLAY_SCORE = 0.5; // don't show weak/off-target matches to the customer

export function renderQuote(input: {
    need: CustomerNeed;
    matches: ProductMatch[];
    upsells: Product[];
}): string {
    const displayMatches = input.matches.filter((m) => m.score >= MIN_DISPLAY_SCORE).slice(0, 3);
    const lines: string[] = [];
    lines.push(`# Sales Quotation`);
    lines.push("");
    lines.push(`## Customer Requirement`);
    lines.push(`- Need: ${input.need.need}`);
    lines.push(`- Budget: Rs. ${input.need.budget.toLocaleString()}`);
    if (input.need.size) lines.push(`- Size: ${input.need.size}`);
    lines.push("");

    lines.push(`## Recommended Products`);
    if (displayMatches.length === 0) {
        lines.push("No strong matches found for this requirement. Consider a custom consultation.");
    } else {
        for (const m of displayMatches) {
            lines.push(`### ${m.product.name}`);
            lines.push(`- Price: Rs. ${m.product.price.toLocaleString()}`);
            lines.push(`- Firmness: ${m.product.firmness ?? "n/a"}`);
            lines.push(`- Warranty: ${m.product.warrantyYears} years`);
            lines.push(`- Why: ${m.reasons.join("; ")}`);
            lines.push("");
        }
    }

    if (input.upsells.length > 0) {
        lines.push(`## Suggested Add-ons`);
        for (const u of input.upsells) {
            lines.push(`- ${u.name} - Rs. ${u.price.toLocaleString()}`);
        }
        lines.push("");
    }

    const top = displayMatches[0];
    if (top) {
        const total = top.product.price + input.upsells.reduce((sum, u) => sum + u.price, 0);
        lines.push(`## Estimated Total (top recommendation + add-ons)`);
        lines.push(`**Rs. ${total.toLocaleString()}**`);
        lines.push("");
    }

    lines.push(`## Next Steps`);
    lines.push(`- [ ] Confirm product choice with customer`);
    lines.push(`- [ ] Schedule delivery`);
    lines.push(`- [ ] Follow up in 3 days if no response`);
    lines.push("");

    return lines.join("\n");
}