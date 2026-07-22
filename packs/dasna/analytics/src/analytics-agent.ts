import { defineAgent, z } from "@business-os/sdk";
import type { CapabilityContext } from "@business-os/capability-core";
import {
  salesPerformanceCapability,
  stockHealthCapability,
  marketingCoverageCapability,
  supportVolumeCapability,
  crossRecommendationsCapability,
  type CrossSignal,
} from "@business-os/capabilities";
import { loadCatalog, loadInventory } from "@dasna/catalog";
import { renderAnalyticsReport } from "./render-report.js";

export const analyticsInputSchema = z.object({
  project: z.string().min(1),
  author: z.string().optional(),
});

export const analyticsOutputSchema = z.object({
  artifactId: z.string(),
  insightCount: z.number(),
});

export const analyticsAgent = defineAgent({
  id: "analytics",
  description:
    "Synthesizes sales, inventory, marketing, and support data into cross-agent business insights and recommendations.",
  inputSchema: analyticsInputSchema,
  outputSchema: analyticsOutputSchema,
  execute: async (ctx) => {
    const author = ctx.input.author ?? "agent:analytics";
    const capCtx: CapabilityContext = { memory: ctx.memory, logger: ctx.logger };

    const [catalog, inventory] = await Promise.all([loadCatalog(), loadInventory()]);
    const productNames: Record<string, string> = Object.fromEntries(catalog.map((p) => [p.id, p.name]));

    // Sales performance (proxy: catalog price x inventory weeklyAvgSales)
    const salesPerformance = await salesPerformanceCapability.run(capCtx, {
      items: catalog
        .filter((p) => inventory[p.id])
        .map((p) => ({
          productId: p.id,
          productName: p.name,
          price: p.price,
          weeklyUnitsSold: inventory[p.id]!.weeklyAvgSales,
        })),
    });

    // Stock health (same threshold heuristic as the Inventory agent)
    const stockHealth = await stockHealthCapability.run(capCtx, {
      items: catalog
        .filter((p) => inventory[p.id])
        .map((p) => {
          const stock = inventory[p.id]!;
          return {
            productId: p.id,
            productName: p.name,
            stock: stock.stock,
            threshold: Math.max(3, Math.ceil(stock.weeklyAvgSales * (stock.leadTimeDays / 7))),
          };
        }),
    });

    // Pull real marketing + support artifacts for this project.
    const marketingArtifacts = await ctx.artifacts.list({ project: ctx.input.project, type: "marketing" });
    const marketingContents = await Promise.all(
      marketingArtifacts.map(async (m) => (await ctx.artifacts.get(m.id))?.content ?? "")
    );

    const supportArtifacts = await ctx.artifacts.list({ project: ctx.input.project, type: "report" });
    const supportOnly = supportArtifacts.filter((a) => a.tags.includes("support"));
    const supportContents = await Promise.all(
      supportOnly.map(async (a) => (await ctx.artifacts.get(a.id))?.content ?? "")
    );
    const supportTopics = supportOnly.map((a) => a.tags.find((t) => t !== "support") ?? "unknown");

    const marketingCoverage = await marketingCoverageCapability.run(capCtx, {
      productIds: catalog.map((p) => p.id),
      productNames,
      campaignContents: marketingContents,
    });

    const supportVolume = await supportVolumeCapability.run(capCtx, {
      productIds: catalog.map((p) => p.id),
      productNames,
      replyContents: supportContents,
      topics: supportTopics,
    });

    const signals: CrossSignal[] = catalog
      .filter((p) => inventory[p.id])
      .map((p) => {
        const sales = salesPerformance.find((s) => s.productId === p.id);
        const stock = stockHealth.find((s) => s.productId === p.id);
        const marketing = marketingCoverage.find((m) => m.productId === p.id);
        const support = supportVolume.byProduct.find((s) => s.productId === p.id);
        return {
          productId: p.id,
          productName: p.name,
          salesSegment: sales?.segment ?? "steady",
          stockStatus: stock?.status ?? "healthy",
          marketingCovered: marketing?.covered ?? false,
          supportQuestionCount: support?.questionCount ?? 0,
        };
      });

    const insights = await crossRecommendationsCapability.run(capCtx, { signals });

    ctx.logger.info("Analytics complete", { insightCount: insights.length });

    const artifact = await ctx.artifacts.create({
      project: ctx.input.project,
      type: "insight",
      title: `Business Analytics Report - ${new Date().toISOString().slice(0, 10)}`,
      content: renderAnalyticsReport({
        salesPerformance,
        stockHealth,
        marketingCoverage,
        supportVolume,
        insights,
      }),
      author,
      tags: ["analytics"],
      status: "draft",
      provenance: {
        generatedBy: {
          agentId: "analytics",
          capabilityIds: [
            "sales-performance",
            "stock-health",
            "marketing-coverage",
            "support-volume",
            "cross-recommendations",
          ],
        },
        inputArtifactIds: [...marketingArtifacts.map((m) => m.id), ...supportOnly.map((s) => s.id)],
        frameworkVersion: "0.9.0-dasna",
        createdAt: Date.now(),
      },
    });

    return { artifactId: artifact.metadata.id, insightCount: insights.length };
  },
});
