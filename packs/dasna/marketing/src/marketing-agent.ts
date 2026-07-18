import { defineAgent, z } from "@business-os/sdk";
import { loadCatalog } from "@dasna/catalog";
import { getCampaignPreset } from "./campaigns.js";
import { generateGeneralCaptions, generateProductCaption } from "./generate-captions.js";
import { renderCampaignBrief } from "./render-campaign.js";

export const marketingInputSchema = z.object({
    project: z.string().min(1),
    campaign: z.string().min(1), // e.g. "dashain"
    featuredProductIds: z.array(z.string()).optional(), // omit to auto-pick a few
    author: z.string().optional(),
});

export const marketingOutputSchema = z.object({
    artifactId: z.string(),
    campaignName: z.string(),
    captionCount: z.number(),
});

export const marketingAgent = defineAgent({
    id: "marketing",
    description:
        "Generates a seasonal campaign brief with general and product-specific social captions, pulled from the Dasna catalog.",
    inputSchema: marketingInputSchema,
    outputSchema: marketingOutputSchema,
    execute: async (ctx) => {
        const author = ctx.input.author ?? "agent:marketing";
        const campaign = getCampaignPreset(ctx.input.campaign);
        const catalog = await loadCatalog();

        const featured = ctx.input.featuredProductIds
            ? catalog.filter((p) => ctx.input.featuredProductIds!.includes(p.id))
            : catalog.filter((p) => p.type !== "accessory").slice(0, 3); // default: first 3 mattresses

        const generalCaptions = generateGeneralCaptions(campaign);
        const productCaptions = featured.map((p) => generateProductCaption(p, campaign));

        ctx.logger.info("Marketing captions generated", {
            campaign: campaign.id,
            featuredCount: featured.length,
        });

        const artifact = await ctx.artifacts.create({
            project: ctx.input.project,
            type: "marketing",
            title: `Marketing Campaign: ${campaign.displayName}`,
            content: renderCampaignBrief({
                campaign,
                generalCaptions,
                featuredProducts: featured,
                productCaptions,
            }),
            author,
            tags: ["marketing", campaign.id],
            status: "draft",
        });

        return {
            artifactId: artifact.metadata.id,
            campaignName: campaign.displayName,
            captionCount: generalCaptions.length + productCaptions.length,
        };
    },
});