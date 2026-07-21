import { describe, it, expect, beforeEach } from "vitest";
import { loadPolicies, __resetPoliciesCache } from "./policies.js";

describe("loadPolicies", () => {
    beforeEach(() => __resetPoliciesCache());

    it("loads policy sections from the JSON data file", async () => {
        const policies = await loadPolicies();
        expect(policies.warranty).toBeDefined();
        expect(policies.delivery).toBeDefined();
        expect(policies.returns).toBeDefined();
    });
});