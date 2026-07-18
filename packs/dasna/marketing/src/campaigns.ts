export interface CampaignPreset {
    id: string;
    displayName: string;
    theme: string;
    tone: string;
    discountHint: string;
}

export const CAMPAIGN_PRESETS: Record<string, CampaignPreset> = {
    dashain: {
        id: "dashain",
        displayName: "Dashain Festival",
        theme: "family gatherings, homecoming, fresh starts",
        tone: "warm, festive, family-oriented",
        discountHint: "festive season offer",
    },
    tihar: {
        id: "tihar",
        displayName: "Tihar Festival",
        theme: "light, renewal, gifting",
        tone: "bright, celebratory",
        discountHint: "Tihar gifting offer",
    },
    "new-year": {
        id: "new-year",
        displayName: "New Year",
        theme: "fresh starts, self-care, better sleep habits",
        tone: "motivational, forward-looking",
        discountHint: "New Year refresh offer",
    },
};

export function getCampaignPreset(id: string): CampaignPreset {
    const preset = CAMPAIGN_PRESETS[id.toLowerCase()];
    if (!preset) {
        throw new Error(
            `Unknown campaign "${id}". Known campaigns: ${Object.keys(CAMPAIGN_PRESETS).join(", ")}`
        );
    }
    return preset;
}