import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INVENTORY_PATH = join(__dirname, "..", "data", "inventory.json");

export interface StockRecord {
    stock: number;
    weeklyAvgSales: number;
    leadTimeDays: number;
}

export type InventoryData = Record<string, StockRecord>;

let cache: InventoryData | null = null;

export async function loadInventory(): Promise<InventoryData> {
    if (cache) return cache;
    const raw = await readFile(INVENTORY_PATH, "utf-8");
    cache = JSON.parse(raw) as InventoryData;
    return cache;
}

export function __resetInventoryCache(): void {
    cache = null;
}