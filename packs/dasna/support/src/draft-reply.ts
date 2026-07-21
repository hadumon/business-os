import type { Policies, Product } from "@dasna/catalog";
import { matchProducts } from "@dasna/catalog";
import type { QuestionTopic } from "./classify.js";

export interface DraftedReply {
    topic: QuestionTopic;
    reply: string;
    sourcedFrom: string;
}

function draftFromPolicy(topic: Exclude<QuestionTopic, "unknown" | "product">, policies: Policies): DraftedReply {
    const section = policies[topic];
    const extra = section
        ? Object.entries(section)
            .filter(([key]) => key !== "summary")
            .map(([, value]) => value)
            .join(" ")
        : "";

    return {
        topic,
        reply: section ? `${section.summary}${extra ? ` ${extra}` : ""}` : "I don't have information on that yet - let me check and get back to you.",
        sourcedFrom: `policy:${topic}`,
    };
}

function draftProductReply(question: string, catalog: Product[]): DraftedReply {
  // Reuse the same matching logic Sales uses - a "which mattress is good for X"
  // question is functionally a sales inquiry with an implicit unlimited budget.
  const matches = matchProducts(catalog, { need: question, budget: Infinity });
  const relevant = matches.filter((m) => m.score >= 0.4).slice(0, 2);

  if (relevant.length > 0) {
    const recommendations = relevant
      .map((m) => `${m.product.name} (Rs. ${m.product.price.toLocaleString()}, ${m.product.firmness ?? "various"} firmness)`)
      .join(" or ");
    const bothPhrase = relevant.length > 1 ? "Both are great options - w" : "W";
    return {
      topic: "product",
      reply: `Based on your question, I'd recommend: ${recommendations}. ${bothPhrase}ould you like more details${relevant.length > 1 ? " on either" : ""}, or a quote?`,
      sourcedFrom: `product:matched:${relevant.map((m) => m.product.id).join(",")}`,
    };
  }

  return {
    topic: "product",
    reply: `We have a range of mattresses to suit different needs and budgets. Could you tell me more about what you're looking for (e.g. size, firmness preference, or budget) so I can recommend the best option?`,
    sourcedFrom: "product:general",
  };
}

export function draftReply(question: string, topic: QuestionTopic, policies: Policies, catalog: Product[]): DraftedReply {
    if (topic === "unknown") {
        return {
            topic,
            reply: `Thanks for reaching out! I want to make sure I give you accurate information - could you clarify your question a bit? I'm happy to help with product details, warranty, delivery, returns, or payment options.`,
            sourcedFrom: "fallback",
        };
    }
    if (topic === "product") {
        return draftProductReply(question, catalog);
    }
    return draftFromPolicy(topic, policies);
}