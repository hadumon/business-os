import { defineAgent, z } from "@business-os/sdk";
import { loadCatalog } from "@dasna/catalog";
import { auditProduct } from "./audit.js";
import { generateCopy } from "./generate-copy.js";
import { renderCatalogEntry } from "./render-catalog-entry.js";

export const catalogInputSchema = z.object({
    project: z.string().min(1),
    productId: z.string().optional(), // omit to process the entire catalog
    author: z.string().optional(),
});

export const catalogOutputSchema = z.object({
    artifactIds: z.array(z.string()),
    productsProcessed: z.number(),
    totalGaps: z.number(),
});

export const catalogAgent = defineAgent({
    id: "catalog",
    description:
        "Generates product descriptions and SEO metadata from raw catalog specs, and audits each product for missing data.",
    inputSchema: catalogInputSchema,
    outputSchema: catalogOutputSchema,
    execute: async (ctx) => {
        const author = ctx.input.author ?? "agent:catalog";
        const catalog = await loadCatalog();

        const targets = ctx.input.productId
            ? catalog.filter((p) => p.id === ctx.input.productId)
            : catalog;

        if (targets.length === 0) {
            throw new Error(`No product found with id "${ctx.input.productId}"`);
        }

        const artifactIds: string[] = [];
        let totalGaps = 0;

        for (const product of targets) {
            const gaps = auditProduct(product);
            totalGaps += gaps.length;
            const copy = generateCopy(product);

            const artifact = await ctx.artifacts.create({
                project: ctx.input.project,
                type: "report",
                title: `Catalog Entry: ${product.name}`,
                content: renderCatalogEntry(product, copy, gaps),
                author,
                tags: ["catalog", product.id, product.type],
                status: gaps.length > 0 ? "review" : "draft",
            });

            artifactIds.push(artifact.metadata.id);

            if (gaps.length > 0) {
                ctx.logger.warn("Data gaps found", { productId: product.id, gapCount: gaps.length });
            }
        }

        ctx.logger.info("Catalog processing complete", {
            productsProcessed: targets.length,
            totalGaps,
        });

        return {
            artifactIds,
            productsProcessed: targets.length,
            totalGaps,
        };
    },
});