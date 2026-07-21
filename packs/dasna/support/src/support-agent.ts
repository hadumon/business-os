import { defineAgent, z } from "@business-os/sdk";
import { loadCatalog, loadPolicies } from "@dasna/catalog";
import { classifyQuestion } from "./classify.js";
import { draftReply } from "./draft-reply.js";
import { renderReplySheet } from "./render-reply.js";

export const supportInputSchema = z.object({
    project: z.string().min(1),
    question: z.string().min(1),
    author: z.string().optional(),
});

export const supportOutputSchema = z.object({
    artifactId: z.string(),
    topic: z.string(),
});

export const supportAgent = defineAgent({
    id: "support",
    description:
        "Classifies a customer question and drafts a reply sourced from Dasna's policies (warranty, delivery, returns, payment) or product catalog.",
    inputSchema: supportInputSchema,
    outputSchema: supportOutputSchema,
    execute: async (ctx) => {
        const author = ctx.input.author ?? "agent:support";

        const [catalog, policies] = await Promise.all([loadCatalog(), loadPolicies()]);
        const topic = classifyQuestion(ctx.input.question);
        const drafted = draftReply(ctx.input.question, topic, policies, catalog);

        ctx.logger.info("Support reply drafted", { topic, sourcedFrom: drafted.sourcedFrom });

        const artifact = await ctx.artifacts.create({
            project: ctx.input.project,
            type: "report",
            title: `Support Reply: ${ctx.input.question.slice(0, 50)}${ctx.input.question.length > 50 ? "..." : ""}`,
            content: renderReplySheet(ctx.input.question, drafted),
            author,
            tags: ["support", topic],
            status: "draft",
        });

        return { artifactId: artifact.metadata.id, topic };
    },
});