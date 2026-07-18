import { describe, it, expect } from "vitest";
import { getCampaignPreset } from "./campaigns.js";

describe("getCampaignPreset", () => {
    it("returns a known preset case-insensitively", () => {
        expect(getCampaignPreset("Dashain").id).toBe("dashain");
        expect(getCampaignPreset("dashain").displayName).toBe("Dashain Festival");
    });

    it("throws with a helpful message for an unknown campaign", () => {
        expect(() => getCampaignPreset("halloween")).toThrow(/Unknown campaign/);
    });
});