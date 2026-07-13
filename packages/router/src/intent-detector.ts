import type { RouteIntent } from "@business-os/core";

export interface IntentDetector {
  detect(rawInput: string, availableIntents: string[]): Promise<RouteIntent> | RouteIntent;
}
