import type { DraftedReply } from "./draft-reply.js";

export function renderReplySheet(question: string, drafted: DraftedReply): string {
    const lines: string[] = [];
    lines.push(`# Customer Support Reply Draft`);
    lines.push("");
    lines.push(`## Customer Question`);
    lines.push(question);
    lines.push("");
    lines.push(`## Classified Topic`);
    lines.push(drafted.topic);
    lines.push("");
    lines.push(`## Drafted Reply`);
    lines.push(drafted.reply);
    lines.push("");
    lines.push(`## Source`);
    lines.push(drafted.sourcedFrom);
    lines.push("");
    lines.push(`## Next Steps`);
    lines.push(`- [ ] Review reply for accuracy and tone before sending`);
    lines.push(`- [ ] Personalize with customer name if known`);
    lines.push("");
    return lines.join("\n");
}