import type { Product } from "@dasna/catalog";
import { humanizeUseCaseList } from "@dasna/catalog";
import type { CampaignPreset } from "./campaigns.js";

export interface Caption {
    platform: "facebook" | "instagram";
    text: string;
    hashtags: string[];
}

function baseHashtags(campaign: CampaignPreset): string[] {
    return ["#DasnaGhar", `#${campaign.displayName.replace(/\s+/g, "")}`, "#MattressNepal", "#SleepWell"];
}

export function generateGeneralCaptions(campaign: CampaignPreset): Caption[] {
    return [
        {
            platform: "facebook",
            text: `This ${campaign.displayName} season, give your family the gift of better sleep. Celebrate the season with a mattress upgrade from Dasna Ghar - because comfort is something everyone deserves.`,
            hashtags: baseHashtags(campaign),
        },
        {
            platform: "instagram",
            text: `${campaign.displayName} is here! Is your mattress ready for the season? Visit Dasna Ghar for a ${campaign.discountHint}.`,
            hashtags: baseHashtags(campaign),
        },
    ];
}

export function generateProductCaption(product: Product, campaign: CampaignPreset): Caption {
  const useCasePhrase =
    product.goodFor.length > 0 ? humanizeUseCaseList(product.goodFor) : "a comfortable night's sleep";

  return {
    platform: "facebook",
    text: `${campaign.displayName} special: the ${product.name} is now available with our ${campaign.discountHint}. Perfect for ${useCasePhrase}. Rs. ${product.price.toLocaleString()} - visit us or message to order.`,
    hashtags: [...baseHashtags(campaign), `#${product.type.replace(/-/g, "")}`],
  };
}