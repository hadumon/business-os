import { defineCapability } from "@business-os/capability-core";

export interface SupportVolumeInput {
  productIds: string[];
  productNames: Record<string, string>;
  /** Raw text content of support reply artifacts. */
  replyContents: string[];
  /** Classified topics, parallel array to replyContents. */
  topics: string[];
}

export interface SupportVolumeResult {
  productId: string;
  productName: string;
  questionCount: number;
}

export interface TopicVolumeResult {
  topic: string;
  count: number;
}

export interface SupportVolumeOutput {
  byProduct: SupportVolumeResult[];
  byTopic: TopicVolumeResult[];
}

export const supportVolumeCapability = defineCapability<SupportVolumeInput, SupportVolumeOutput>({
  id: "support-volume",
  description: "Counts support question volume per product and per topic to surface confusion hotspots.",
  run: (ctx, input) => {
    const byProduct = input.productIds.map((productId) => {
      const name = input.productNames[productId] ?? productId;
      const count = input.replyContents.filter((content) => content.includes(name)).length;
      return { productId, productName: name, questionCount: count };
    });

    const topicCounts = new Map<string, number>();
    for (const topic of input.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
    const byTopic = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    ctx.logger.debug("Support volume computed", { topicCount: byTopic.length });
    return { byProduct, byTopic };
  },
});
