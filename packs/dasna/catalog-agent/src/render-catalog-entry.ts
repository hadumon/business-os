import type { Product } from "@dasna/catalog";
import type { ProductCopy } from "./generate-copy.js";
import type { DataGap } from "./audit.js";

export function renderCatalogEntry(product: Product, copy: ProductCopy, gaps: DataGap[]): string {
    const lines: string[] = [];
    lines.push(`# ${product.name}`);
    lines.push("");
    lines.push(`## Description`);
    lines.push(copy.description);
    lines.push("");
    lines.push(`## Specifications`);
    for (const spec of copy.bulletSpecs) lines.push(`- ${spec}`);
    lines.push("");
    lines.push(`## SEO`);
    lines.push(`- Meta title: ${copy.seo.metaTitle}`);
    lines.push(`- Meta description: ${copy.seo.metaDescription}`);
    lines.push(`- Keywords: ${copy.seo.keywords.join(", ")}`);
    lines.push("");
    lines.push(`## Data Quality`);
    if (gaps.length === 0) {
        lines.push("No data gaps found.");
    } else {
        lines.push(`${gaps.length} issue(s) found:`);
        for (const gap of gaps) lines.push(`- **${gap.field}**: ${gap.issue}`);
    }
    lines.push("");
    return lines.join("\n");
}