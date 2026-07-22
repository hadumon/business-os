import type { StockHealthResult, FastMovingResult, ReorderResult } from "@business-os/capabilities";

function statusLabel(status: string): string {
  if (status === "critical") return "[CRITICAL]";
  if (status === "low") return "[LOW]";
  return "[OK]";
}

export function renderInventoryReport(input: {
  stockHealth: StockHealthResult[];
  fastMoving: FastMovingResult[];
  reorder: ReorderResult[];
}): string {
  const lines: string[] = [];
  lines.push(`# Inventory Report`);
  lines.push("");

  lines.push(`## Stock Health`);
  lines.push("");
  for (const item of input.stockHealth) {
    lines.push(`${statusLabel(item.status)} **${item.productName}**`);
    lines.push(`- Stock: ${item.stock} (threshold: ${item.threshold})`);
    lines.push(`- Status: ${item.status}`);
    lines.push("");
  }

  lines.push(`## Fastest-Moving Products`);
  lines.push("");
  for (const item of input.fastMoving) {
    lines.push(`${item.rank}. ${item.productName} - ${item.weeklyAvgSales} units/week`);
  }
  lines.push("");

  lines.push(`## Reorder Recommendations`);
  lines.push("");
  const urgent = input.reorder.filter((r) => r.recommendation === "reorder now");
  const soon = input.reorder.filter((r) => r.recommendation === "reorder soon");
  const monitor = input.reorder.filter((r) => r.recommendation === "monitor");

  if (urgent.length > 0) {
    lines.push("**Reorder Now:**");
    for (const r of urgent) {
      lines.push(`- ${r.productName} (${r.weeksOfStockLeft ?? "n/a"} weeks of stock left)`);
    }
    lines.push("");
  }
  if (soon.length > 0) {
    lines.push("**Reorder Soon:**");
    for (const r of soon) {
      lines.push(`- ${r.productName} (${r.weeksOfStockLeft ?? "n/a"} weeks of stock left)`);
    }
    lines.push("");
  }
  if (monitor.length > 0) {
    lines.push("**Monitor:**");
    for (const r of monitor) {
      lines.push(`- ${r.productName}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
