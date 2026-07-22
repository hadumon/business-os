import type {
  SalesPerformanceResult,
  StockHealthResult,
  MarketingCoverageResult,
  SupportVolumeOutput,
  BusinessInsight,
} from "@business-os/capabilities";

function severityLabel(severity: BusinessInsight["severity"]): string {
  if (severity === "warning") return "[WARNING]";
  if (severity === "opportunity") return "[OPPORTUNITY]";
  return "[INFO]";
}

export function renderAnalyticsReport(input: {
  salesPerformance: SalesPerformanceResult[];
  stockHealth: StockHealthResult[];
  marketingCoverage: MarketingCoverageResult[];
  supportVolume: SupportVolumeOutput;
  insights: BusinessInsight[];
}): string {
  const lines: string[] = [];
  lines.push(`# Business Analytics Report`);
  lines.push("");

  lines.push(`## Revenue Drivers`);
  lines.push("");
  for (const p of input.salesPerformance.slice(0, 5)) {
    lines.push(`${p.rank}. ${p.productName} - ${Math.round(p.revenueShare * 100)}% of revenue (${p.segment})`);
  }
  lines.push("");

  lines.push(`## Inventory Risks`);
  lines.push("");
  const atRisk = input.stockHealth.filter((s) => s.status !== "healthy");
  if (atRisk.length === 0) {
    lines.push("No inventory risks detected.");
  } else {
    for (const s of atRisk) {
      lines.push(`- ${s.productName}: ${s.status} (stock ${s.stock}, threshold ${s.threshold})`);
    }
  }
  lines.push("");

  lines.push(`## Marketing Opportunities`);
  lines.push("");
  const uncovered = input.marketingCoverage.filter((m) => !m.covered);
  if (uncovered.length === 0) {
    lines.push("All products have some campaign coverage.");
  } else {
    lines.push("Products with no campaign coverage:");
    for (const m of uncovered) lines.push(`- ${m.productName}`);
  }
  lines.push("");

  lines.push(`## Customer Trends`);
  lines.push("");
  if (input.supportVolume.byTopic.length === 0) {
    lines.push("No support activity recorded yet.");
  } else {
    lines.push("Most common question topics:");
    for (const t of input.supportVolume.byTopic.slice(0, 5)) {
      lines.push(`- ${t.topic}: ${t.count} question(s)`);
    }
  }
  lines.push("");

  lines.push(`## Recommended Actions`);
  lines.push("");
  if (input.insights.length === 0) {
    lines.push("No cross-agent insights triggered this run - business signals are balanced.");
  } else {
    for (const insight of input.insights) {
      lines.push(`### ${severityLabel(insight.severity)} ${insight.title}`);
      lines.push(`Confidence: ${insight.confidence}`);
      lines.push(`Evidence: ${insight.evidence.join("; ")}`);
      lines.push(`Recommendation: ${insight.recommendation}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
