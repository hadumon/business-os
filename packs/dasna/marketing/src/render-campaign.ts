import type { Caption } from "./generate-captions.js";
import type { CampaignPreset } from "./campaigns.js";
import type { Product } from "@dasna/catalog";

function renderCaption(caption: Caption): string {
    return `**[${caption.platform}]**\n${caption.text}\n\n${caption.hashtags.join(" ")}`;
}

export function renderCampaignBrief(input: {
    campaign: CampaignPreset;
    generalCaptions: Caption[];
    featuredProducts: Product[];
    productCaptions: Caption[];
}): string {
    const lines: string[] = [];
    lines.push(`# Marketing Campaign: ${input.campaign.displayName}`);
    lines.push("");
    lines.push(`## Campaign Brief`);
    lines.push(`- Theme: ${input.campaign.theme}`);
    lines.push(`- Tone: ${input.campaign.tone}`);
    lines.push(`- Offer angle: ${input.campaign.discountHint}`);
    lines.push("");

    lines.push(`## General Posts`);
    lines.push("");
    for (const c of input.generalCaptions) {
        lines.push(renderCaption(c));
        lines.push("");
    }

    if (input.featuredProducts.length > 0) {
        lines.push(`## Featured Products`);
        lines.push("");
        for (const p of input.featuredProducts) {
            lines.push(`- ${p.name} - Rs. ${p.price.toLocaleString()}`);
        }
        lines.push("");

        lines.push(`## Product Posts`);
        lines.push("");
        for (const c of input.productCaptions) {
            lines.push(renderCaption(c));
            lines.push("");
        }
    }

    lines.push(`## Next Steps`);
    lines.push(`- [ ] Review captions for tone`);
    lines.push(`- [ ] Schedule posts across the campaign week`);
    lines.push(`- [ ] Prepare accompanying product photos`);
    lines.push("");

    return lines.join("\n");
}