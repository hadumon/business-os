import { describe, it, expect, beforeEach } from "vitest";
import { loadInventory, __resetInventoryCache } from "./inventory-data.js";

describe("loadInventory", () => {
    beforeEach(() => __resetInventoryCache());

    it("loads stock records keyed by product id", async () => {
        const inventory = await loadInventory();
        expect(Object.keys(inventory).length).toBeGreaterThan(0);
        expect(inventory["mat-orthopedic-queen"]).toHaveProperty("stock");
    });
});