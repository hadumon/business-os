import type { DiscoverPipelineState } from "./types.js";

export function renderDiscoverReport(state: DiscoverPipelineState): string {
  const lines: string[] = [];

  lines.push(`# Discovery Report: ${state.topic}`);
  lines.push("");
  lines.push("## Problem Statement");
  lines.push(state.problemStatement ?? "_not available_");
  lines.push("");
  lines.push("## Pain Points");
  for (const p of state.painPoints ?? []) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## Market Signals");
  for (const s of state.signals ?? [])
    lines.push(`- ${s.label}: ${(s.strength * 100).toFixed(0)}%`);
  lines.push("");
  lines.push("## Competitors");
  for (const c of state.competitors ?? []) {
    lines.push(`- **${c.name}** (strength ${(c.strength * 100).toFixed(0)}%) — ${c.notes}`);
  }
  lines.push("");
  lines.push("## Demand Validation");
  lines.push(`Score: ${state.demandScore ?? "n/a"} / 100`);
  lines.push("");
  lines.push("## Opportunity Score");
  lines.push(`**${state.opportunityScore ?? "n/a"} / 100**`);
  lines.push("");
  lines.push("## Proposed Business Model");
  lines.push(state.businessModel ?? "_not available_");
  lines.push("");
  lines.push("## Risk Analysis");
  for (const r of state.risks ?? []) lines.push(`- ${r.label}: **${r.severity}**`);
  lines.push("");
  lines.push("## Recommendation");
  lines.push(state.recommendation ?? "_not available_");
  lines.push("");

  return lines.join("\n");
}
