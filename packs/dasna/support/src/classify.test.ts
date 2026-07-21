import { describe, it, expect } from "vitest";
import { classifyQuestion } from "./classify.js";

describe("classifyQuestion", () => {
    it("classifies warranty questions", () => {
        expect(classifyQuestion("What's the warranty on this mattress?")).toBe("warranty");
    });
    it("classifies delivery questions", () => {
        expect(classifyQuestion("Do you deliver to Pokhara?")).toBe("delivery");
    });
    it("classifies return questions", () => {
        expect(classifyQuestion("Can I return it if I don't like it?")).toBe("returns");
    });
    it("classifies payment questions", () => {
        expect(classifyQuestion("Can I pay with eSewa?")).toBe("payment");
    });
    it("classifies product questions", () => {
        expect(classifyQuestion("Which mattress is good for back pain?")).toBe("product");
    });
    it("falls back to unknown for unrelated questions", () => {
        expect(classifyQuestion("What time do you close on Fridays?")).toBe("unknown");
    });
});