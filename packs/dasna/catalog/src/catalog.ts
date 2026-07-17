import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import type { Product } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "products.json");

let cache: Product[] | null = null;

export async function loadCatalog(): Promise<Product[]> {
    if (cache) return cache;
    const raw = await readFile(DATA_PATH, "utf-8");
    cache = JSON.parse(raw) as Product[];
    return cache;
}

/** Test-only: clears the module-level cache so tests don't leak state. */
export function __resetCatalogCache(): void {
    cache = null;
}