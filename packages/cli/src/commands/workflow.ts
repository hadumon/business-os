import { Command } from "commander";

const WORKFLOW_SHAPES: Record<string, string[]> = {
  discover: [
    "market-scan",
    "competitor-analysis",
    "demand-validation",
    "opportunity-score",
    "business-model",
    "risk-analysis",
    "recommendation",
  ],
  strategy: [
    "market-research",
    "competitor-analysis",
    "demand-validation",
    "opportunity-scoring",
    "swot",
    "pricing",
    "artifact-creation",
  ],
  product: [
    "read-strategy-artifact",
    "extract-problem-statement",
    "derive-requirements",
    "render-prd",
    "link-relationship",
  ],
  sales: [
    "load-catalog",
    "match-products",
    "suggest-upsells",
    "render-quote",
    "create-artifact",
  ],
  catalog: [
    "load-catalog",
    "validate-schema",
    "format-product-entries",
    "create-artifact",
  ],
  marketing: [
    "load-campaign-templates",
    "customize-for-topic",
    "render-copy",
    "create-artifact",
  ],
  support: [
    "load-knowledge-base",
    "classify-topic",
    "generate-response",
    "create-artifact",
  ],
  inventory: [
    "load-catalog-and-inventory",
    "compute-stock-health",
    "flag-reorder-candidates",
    "render-report",
    "create-artifact",
  ],
  analytics: [
    "evaluate-sales-performance",
    "evaluate-stock-health",
    "analyze-marketing-coverage",
    "analyze-support-volume",
    "synthesize-cross-recommendations",
    "render-report",
    "create-artifact",
  ],
};

export function registerWorkflowCommand(program: Command): void {
  program
    .command("workflow <agent>")
    .description("Show the workflow pipeline for a given agent (e.g. `bos workflow discover`)")
    .action((agentId: string) => {
      const stages = WORKFLOW_SHAPES[agentId];
      if (!stages) {
        console.error(
          `No known workflow for "${agentId}". Known workflows: ${Object.keys(WORKFLOW_SHAPES).join(", ")}`,
        );
        process.exitCode = 1;
        return;
      }
      console.log(`Workflow: ${agentId}\n`);
      stages.forEach((stage, i) => {
        console.log(`  ${i + 1}. ${stage}`);
        if (i < stages.length - 1) console.log("     ↓");
      });
    });
}
