import type { WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

export function renderWritingDraftPlainText(draft: WritingStructuredDraft): string {
  const parts: string[] = [draft.title];

  for (const section of draft.sections) {
    parts.push(section.heading);
    parts.push(section.plainText);
  }

  for (const item of draft.faq) {
    parts.push(item.question);
    parts.push(item.answerHtml.replace(/<[^>]+>/g, " ").trim());
  }

  if (draft.cta.primary.text) {
    parts.push(`${draft.cta.primary.text} ${draft.cta.primary.destination ?? ""}`.trim());
  }

  return parts.filter(Boolean).join("\n\n");
}
