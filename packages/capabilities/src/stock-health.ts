import { defineCapability } from "@business-os/capability-core";

export interface StockItem {
  productId: string;
  productName: string;
  stock: number;
  threshold: number;
}

export type StockStatus = "critical" | "low" | "healthy";

export interface StockHealthResult {
  productId: string;
  productName: string;
  stock: number;
  threshold: number;
  status: StockStatus;
}

export interface StockHealthInput {
  items: StockItem[];
}

function statusFor(stock: number, threshold: number): StockStatus {
  if (stock <= threshold * 0.5) return "critical";
  if (stock <= threshold) return "low";
  return "healthy";
}

export const stockHealthCapability = defineCapability<StockHealthInput, StockHealthResult[]>({
  id: "stock-health",
  description: "Classifies each product's stock level as critical, low, or healthy against its threshold.",
  run: (ctx, input) => {
    const results = input.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      stock: item.stock,
      threshold: item.threshold,
      status: statusFor(item.stock, item.threshold),
    }));
    ctx.logger.debug("Stock health computed", {
      critical: results.filter((r) => r.status === "critical").length,
    });
    return results;
  },
});
