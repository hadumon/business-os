import { defineAgent, z } from "@business-os/sdk";
import type { CapabilityContext } from "@business-os/capability-core";
import {
  stockHealthCapability,
  fastMovingProductsCapability,
  reorderRecommendationCapability,
} from "@business-os/capabilities";
import { loadCatalog, loadInventory } from "@dasna/catalog";
import { renderInventoryReport } from "./render-report.js";

export const inventoryInputSchema = z.object({
  project: z.string().min(1),
  author: z.string().optional(),
});

export const inventoryOutputSchema = z.object({
  artifactId: z.string(),
  criticalCount: z.number(),
  reorderNowCount: z.number(),
});

export const inventoryAgent = defineAgent({
  id: "inventory",
  description:
    "Answers three questions: what needs attention today (stock health), what sells fastest, and what should be reordered.",
  inputSchema: inventoryInputSchema,
  outputSchema: inventoryOutputSchema,
  execute: async (ctx) => {
    const author = ctx.input.author ?? "agent:inventory";
    const capCtx: CapabilityContext = { memory: ctx.memory, logger: ctx.logger };

    const [catalog, inventory] = await Promise.all([loadCatalog(), loadInventory()]);

    const items = catalog
      .filter((p) => inventory[p.id])
      .map((p) => ({ product: p, stock: inventory[p.id]! }));

    const stockHealth = await stockHealthCapability.run(capCtx, {
      items: items.map(({ product, stock }) => ({
        productId: product.id,
        productName: product.name,
        stock: stock.stock,
        threshold: Math.max(3, Math.ceil(stock.weeklyAvgSales * (stock.leadTimeDays / 7))),
      })),
    });

    const fastMoving = await fastMovingProductsCapability.run(capCtx, {
      items: items.map(({ product, stock }) => ({
        productId: product.id,
        productName: product.name,
        weeklyAvgSales: stock.weeklyAvgSales,
      })),
      top: 5,
    });

    const reorder = await reorderRecommendationCapability.run(capCtx, {
      items: items.map(({ product, stock }) => ({
        productId: product.id,
        productName: product.name,
        stock: stock.stock,
        weeklyAvgSales: stock.weeklyAvgSales,
        leadTimeDays: stock.leadTimeDays,
      })),
    });

    ctx.logger.info("Inventory analysis complete", {
      critical: stockHealth.filter((s) => s.status === "critical").length,
      reorderNow: reorder.filter((r) => r.recommendation === "reorder now").length,
    });

    const artifact = await ctx.artifacts.create({
      project: ctx.input.project,
      type: "report",
      title: `Inventory Report - ${new Date().toISOString().slice(0, 10)}`,
      content: renderInventoryReport({ stockHealth, fastMoving, reorder }),
      author,
      tags: ["inventory"],
      status: "draft",
      provenance: {
        generatedBy: {
          agentId: "inventory",
          capabilityIds: ["stock-health", "fast-moving-products", "reorder-recommendation"],
        },
        inputArtifactIds: [],
        frameworkVersion: "0.8.1-dasna",
        createdAt: Date.now(),
      },
    });

    return {
      artifactId: artifact.metadata.id,
      criticalCount: stockHealth.filter((s) => s.status === "critical").length,
      reorderNowCount: reorder.filter((r) => r.recommendation === "reorder now").length,
    };
  },
});
