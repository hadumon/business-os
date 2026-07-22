import type { ProductMatch, CustomerNeed } from "@dasna/catalog";
import type { Product } from "@dasna/catalog";

export function renderQuote(input: {
  need: CustomerNeed;
  matches: ProductMatch[]; // now pre-filtered by the caller (sales-agent.ts)
  upsells: Product[];
}): string {
  const displayMatches = input.matches.slice(0, 3);
  const isFallback = input.matches.length > 0 && input.matches.every((m) => m.score < 0.5);

  const lines: string[] = [];
  lines.push(`# Sales Quotation`);
  lines.push("");
  lines.push(`## Customer Requirement`);
  lines.push(`- Need: ${input.need.need}`);
  lines.push(`- Budget: Rs. ${input.need.budget.toLocaleString()}`);
  if (input.need.size) lines.push(`- Size: ${input.need.size}`);
  lines.push("");

  lines.push(`## Recommended Products`);
  if (isFallback) {
    lines.push("_No exact match found for your specific need - showing closest available options by budget._");
    lines.push("");
  }
  if (displayMatches.length === 0) {
    lines.push("No matching products found for this requirement.");
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