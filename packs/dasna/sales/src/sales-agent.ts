import { defineAgent, z } from "@business-os/sdk";
import { loadCatalog } from "@dasna/catalog";
import { matchProducts, suggestUpsells } from "@dasna/catalog";
import { renderQuote } from "./render-quote.js";

export const salesInputSchema = z.object({
    project: z.string().min(1),
    need: z.string().min(1),
    budget: z.number().positive(),
    size: z.string().optional(),
    customerName: z.string().optional(),
    author: z.string().optional(),
});

export const salesOutputSchema = z.object({
    artifactId: z.string(),
    topRecommendation: z.string().optional(),
    matchCount: z.number(),
});

export const salesAgent = defineAgent({
    id: "sales",
    description:
        "Qualifies a customer need against the Dasna catalog and produces a quotation artifact with product recommendations and upsells.",
    inputSchema: salesInputSchema,
    outputSchema: salesOutputSchema,
    execute: async (ctx) => {
        const MIN_DISPLAY_SCORE = 0.5;
        const author = ctx.input.author ?? "agent:sales";

        const catalog = await loadCatalog();
        const matches = matchProducts(catalog, {
            need: ctx.input.need,
            budget: ctx.input.budget,
            ...(ctx.input.size !== undefined ? { size: ctx.input.size } : {}),
        });

        const strongMatches = matches.filter((m) => m.score >= MIN_DISPLAY_SCORE);
        const displayMatches = strongMatches.length > 0 ? strongMatches : matches.slice(0, 2); // fallback: show closest options even if weak

        const upsells = displayMatches[0] ? suggestUpsells(catalog, displayMatches[0].product) : [];

        ctx.logger.info("Sales matching complete", {
            matchCount: displayMatches.length,
            topProduct: displayMatches[0]?.product.id,
        });

        const title = ctx.input.customerName
            ? `Quotation for ${ctx.input.customerName}`
            : `Quotation: ${ctx.input.need}`;

        const artifact = await ctx.artifacts.create({
            project: ctx.input.project,
            type: "report", // reusing the existing "report" type; a dedicated "quote" type is a safe additive change later
            title,
            content: renderQuote({
                need: { need: ctx.input.need, budget: ctx.input.budget, ...(ctx.input.size !== undefined ? { size: ctx.input.size } : {}) },
                matches: displayMatches,
                upsells,
            }),
            author,
            tags: ["sales", "quotation"],
            status: "draft",
        });

        await ctx.memory.write(
            `sales/${ctx.input.project}/${Date.now()}.md`,
            `# Sales inquiry\n\nNeed: ${ctx.input.need}\nBudget: Rs. ${ctx.input.budget}\nMatches: ${displayMatches.length}\n`
        );

        return {
            artifactId: artifact.metadata.id,
            topRecommendation: displayMatches[0]?.product.name,
            matchCount: displayMatches.length,
        };
    },
});