import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICIES_PATH = join(__dirname, "..", "data", "policies.json");

export interface PolicySection {
    summary: string;
    [key: string]: string; // additional fields like "exclusions", "cost", "conditions"
}

export type Policies = Record<string, PolicySection>;

let cache: Policies | null = null;

export async function loadPolicies(): Promise<Policies> {
    if (cache) return cache;
    const raw = await readFile(POLICIES_PATH, "utf-8");
    cache = JSON.parse(raw) as Policies;
    return cache;
}

export function __resetPoliciesCache(): void {
    cache = null;
}