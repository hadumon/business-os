import { Command } from "commander";
import type { Product } from "@dasna/catalog";

interface HealthCheck {
    label: string;
    ok: boolean;
    detail?: string | undefined;
}

export function registerHealthCommand(program: Command): void {
    program
        .command("health")
        .description("Check that the Dasna Business Pack's data sources are loadable and valid")
        .action(async () => {
            const checks: HealthCheck[] = [];

            try {
                const { loadCatalog } = await import("@dasna/catalog");
                const catalog = await loadCatalog();
                checks.push({ label: "Catalog loaded", ok: catalog.length > 0, detail: `${catalog.length} products` });

                const invalidProducts = catalog.filter((p: Product) => !p.id || !p.name || p.price <= 0);
                checks.push({
                    label: "Products validated",
                    ok: invalidProducts.length === 0,
                    detail: invalidProducts.length > 0 ? `${invalidProducts.length} invalid entries` : undefined,
                });
            } catch (err) {
                checks.push({ label: "Catalog loaded", ok: false, detail: String(err) });
                checks.push({ label: "Products validated", ok: false, detail: "skipped — catalog failed to load" });
            }

            try {
                const { loadPolicies } = await import("@dasna/catalog");
                const policies = await loadPolicies();
                const requiredSections = ["warranty", "delivery", "returns", "payment"];
                const missing = requiredSections.filter((s) => !policies[s]);
                checks.push({
                    label: "Policies loaded",
                    ok: missing.length === 0,
                    detail: missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
                });
            } catch (err) {
                checks.push({ label: "Policies loaded", ok: false, detail: String(err) });
            }

            try {
                const { CAMPAIGN_PRESETS } = await import("@dasna/agent-marketing");
                const count = Object.keys(CAMPAIGN_PRESETS).length;
                checks.push({ label: "Marketing templates found", ok: count > 0, detail: `${count} campaign presets` });
            } catch (err) {
                checks.push({ label: "Marketing templates found", ok: false, detail: String(err) });
            }

            try {
                await import("@dasna/agent-sales");
                checks.push({ label: "Sales rules loaded", ok: true });
            } catch (err) {
                checks.push({ label: "Sales rules loaded", ok: false, detail: String(err) });
            }

            try {
                await import("@dasna/agent-support");
                checks.push({ label: "Support knowledge loaded", ok: true });
            } catch (err) {
                checks.push({ label: "Support knowledge loaded", ok: false, detail: String(err) });
            }

            console.log("Dasna Business Pack\n");
            let allOk = true;
            for (const check of checks) {
                const icon = check.ok ? "✓" : "✗";
                console.log(`  ${icon} ${check.label}${check.detail ? ` (${check.detail})` : ""}`);
                if (!check.ok) allOk = false;
            }
            console.log("");
            console.log(`Overall Status: ${allOk ? "Healthy" : "Unhealthy"}`);
            if (!allOk) process.exitCode = 1;
        });
}