import { describe, it, expect, beforeEach } from "vitest";
import { loadCatalog, __resetCatalogCache } from "./catalog.js";

describe("loadCatalog", () => {
    beforeEach(() => __resetCatalogCache());

    it("loads products from the JSON data file", async () => {
        const products = await loadCatalog();
        expect(products.length).toBeGreaterThan(0);
        expect(products[0]).toHaveProperty("id");
        expect(products[0]).toHaveProperty("price");
    });
});