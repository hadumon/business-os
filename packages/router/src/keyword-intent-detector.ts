import type { RouteIntent } from "@business-os/core";
import type { IntentDetector } from "./intent-detector.js";

export interface KeywordRule {
  intent: string;
  keywords: string[];
}

export class KeywordIntentDetector implements IntentDetector {
  constructor(private rules: KeywordRule[]) {}

  detect(rawInput: string, availableIntents: string[]): RouteIntent {
    const normalized = rawInput.toLowerCase();

    let bestMatch: { intent: string; score: number } | null = null;

    for (const rule of this.rules) {
      if (!availableIntents.includes(rule.intent)) continue;

      const matches = rule.keywords.filter((kw) => normalized.includes(kw.toLowerCase()));
      if (matches.length === 0) continue;

      const score = matches.length / rule.keywords.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { intent: rule.intent, score };
      }
    }

    if (!bestMatch) {
      return { raw: rawInput, detectedIntent: undefined, confidence: 0 };
    }

    return {
      raw: rawInput,
      detectedIntent: bestMatch.intent,
      confidence: bestMatch.score,
    };
  }
}
