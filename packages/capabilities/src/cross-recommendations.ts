import { defineCapability } from "@business-os/capability-core";

export interface CrossSignal {
  productId: string;
  productName: string;
  salesSegment: "top-seller" | "steady" | "slow-mover";
  stockStatus: "critical" | "low" | "healthy";
  marketingCovered: boolean;
  supportQuestionCount: number;
}

export interface BusinessInsight {
  title: string;
  severity: "info" | "opportunity" | "warning";
  confidence: "low" | "medium" | "high";
  evidence: string[];
  recommendation: string;
}

export interface CrossRecommendationsInput {
  signals: CrossSignal[];
}

export const crossRecommendationsCapability = defineCapability<CrossRecommendationsInput, BusinessInsight[]>({
  id: "cross-recommendations",
  description: "Correlates sales, inventory, marketing, and support signals per product into actionable business insights.",
  run: (ctx, input) => {
    const insights: BusinessInsight[] = [];

    for (const s of input.signals) {
      // Top seller, under-promoted -> opportunity
      if (s.salesSegment === "top-seller" && !s.marketingCovered && s.stockStatus === "healthy") {
        insights.push({
          title: `${s.productName} is a top seller but under-promoted`,
          severity: "opportunity",
          confidence: "medium",
          evidence: [`Sales segment: top-seller`, `Marketing coverage: none found`, `Stock: healthy`],
          recommendation: "Increase advertising frequency while inventory remains healthy.",
        });
      }

      // High support volume, low sales -> warning
      if (s.supportQuestionCount >= 2 && s.salesSegment === "slow-mover") {
        insights.push({
          title: `${s.productName} generates support questions but sells slowly`,
          severity: "warning",
          confidence: "medium",
          evidence: [`Support questions: ${s.supportQuestionCount}`, `Sales segment: slow-mover`],
          recommendation: "Review product page copy and FAQs - customers may be confused before purchasing.",
        });
      }

      // Low/critical stock but actively marketed -> warning
      if ((s.stockStatus === "low" || s.stockStatus === "critical") && s.marketingCovered) {
        insights.push({
          title: `${s.productName} is being promoted despite thin stock`,
          severity: "warning",
          confidence: "high",
          evidence: [`Stock status: ${s.stockStatus}`, `Marketing coverage: active`],
          recommendation: "Pause promotions until stock recovers, or highlight limited availability.",
        });
      }

      // Top seller with critical stock -> highest priority warning
      if (s.salesSegment === "top-seller" && s.stockStatus === "critical") {
        insights.push({
          title: `${s.productName} is a top seller running critically low on stock`,
          severity: "warning",
          confidence: "high",
          evidence: [`Sales segment: top-seller`, `Stock status: critical`],
          recommendation: "Reorder immediately - stockout risk on your best-performing product.",
        });
      }
    }

    ctx.logger.debug("Cross recommendations generated", { count: insights.length });
    return insights;
  },
});
