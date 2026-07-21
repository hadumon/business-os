export type QuestionTopic = "warranty" | "delivery" | "returns" | "payment" | "product" | "unknown";

const TOPIC_KEYWORDS: Record<Exclude<QuestionTopic, "unknown">, string[]> = {
    warranty: ["warranty", "guarantee", "defect", "sagging"],
    delivery: ["deliver", "shipping", "ship", "how long", "when will"],
    returns: ["return", "refund", "exchange", "not satisfied", "trial"],
    payment: ["pay", "payment", "cod", "cash on delivery", "installment", "esewa", "khalti"],
    product: ["mattress", "firmness", "size", "queen", "king", "single", "price", "recommend"],
};

export function classifyQuestion(question: string): QuestionTopic {
    const q = question.toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some((kw) => q.includes(kw))) {
            return topic as QuestionTopic;
        }
    }
    return "unknown";
}