import type { Competitor, MarketSignal, RiskItem } from "./types.js";

/**
 * Every function here is a placeholder heuristic. Swap the body for a real
 * data source (market API, competitor intelligence tool, LLM call) without
 * changing the workflow that calls it.
 */

export async function scanMarket(topic: string): Promise<MarketSignal[]> {
  // Placeholder: derive naive signal strength from topic keyword length/specificity.
  const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
  return [
    { label: `${topic} search interest`, strength: Math.min(0.9, 0.4 + words.length * 0.1) },
    { label: `${topic} funding activity`, strength: 0.5 },
    { label: `${topic} community discussion volume`, strength: 0.6 },
  ];
}

export async function discoverProblem(
  topic: string,
  signals: MarketSignal[],
): Promise<{ problemStatement: string; painPoints: string[] }> {
  const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
  return {
    problemStatement: `Users researching "${topic}" show ${
      avgStrength > 0.6 ? "strong" : "moderate"
    } unmet need signals across ${signals.length} tracked indicators.`,
    painPoints: [
      `Existing solutions for "${topic}" are fragmented`,
      `Users report friction in current workflows`,
      `Pricing models don't match usage patterns`,
    ],
  };
}

export async function analyzeCompetitors(topic: string): Promise<Competitor[]> {
  // Placeholder: fixed shape, real implementation would query a data source.
  return [
    { name: `${topic} Inc.`, strength: 0.7, notes: "Established player, weak in UX" },
    {
      name: `Open${topic.replace(/\s+/g, "")}`,
      strength: 0.4,
      notes: "Open-source alternative, limited support",
    },
  ];
}

export async function validateDemand(
  signals: MarketSignal[],
  competitors: Competitor[],
): Promise<number> {
  const signalScore = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
  const competitionPenalty =
    competitors.reduce((sum, c) => sum + c.strength, 0) / (competitors.length || 1);
  const raw = signalScore * 100 - competitionPenalty * 20;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function scoreOpportunity(demandScore: number, competitorCount: number): number {
  const competitionAdjustment = Math.max(0, 15 - competitorCount * 5);
  return Math.max(0, Math.min(100, Math.round(demandScore * 0.8 + competitionAdjustment)));
}

export async function proposeBusinessModel(
  topic: string,
  opportunityScore: number,
): Promise<string> {
  const model = opportunityScore > 60 ? "Subscription SaaS" : "Usage-based / freemium";
  return `${model} targeting "${topic}" buyers, prioritizing fast time-to-value given an opportunity score of ${opportunityScore}.`;
}

export async function analyzeRisks(
  competitors: Competitor[],
  opportunityScore: number,
): Promise<RiskItem[]> {
  const risks: RiskItem[] = [
    { label: "Market timing", severity: opportunityScore > 70 ? "low" : "medium" },
    { label: "Competitive response", severity: competitors.length > 2 ? "high" : "medium" },
    { label: "Execution complexity", severity: "medium" },
  ];
  return risks;
}

export function buildRecommendation(
  topic: string,
  opportunityScore: number,
  risks: RiskItem[],
): string {
  const highRisks = risks.filter((r) => r.severity === "high");
  if (opportunityScore >= 70 && highRisks.length === 0) {
    return `Proceed: "${topic}" shows a strong opportunity (score ${opportunityScore}) with manageable risk.`;
  }
  if (opportunityScore >= 40) {
    return `Investigate further: "${topic}" shows moderate opportunity (score ${opportunityScore}). Address ${
      highRisks.map((r) => r.label).join(", ") || "identified risks"
    } before committing.`;
  }
  return `Deprioritize: "${topic}" shows weak opportunity signals (score ${opportunityScore}) relative to competitive and market risk.`;
}
