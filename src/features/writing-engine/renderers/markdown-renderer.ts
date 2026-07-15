import type { WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

export function renderWritingDraftMarkdown(draft: WritingStructuredDraft): string {
  const parts: string[] = [];
  parts.push(`# ${draft.title}`);

  for (const section of draft.sections) {
    parts.push(`## ${section.heading}`);
    parts.push(htmlToMarkdown(section.html));
  }

  if (draft.faq.length > 0) {
    parts.push("## Câu hỏi thường gặp");
    for (const item of draft.faq) {
      parts.push(`### ${item.question}`);
      parts.push(htmlToMarkdown(item.answerHtml));
    }
  }

  if (draft.cta.primary.text) {
    const href = draft.cta.primary.destination ?? "/lien-he";
    parts.push(`[${draft.cta.primary.text}](${href})`);
  }

  return parts.filter(Boolean).join("\n\n");
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_, t) => `### ${stripTags(t)}`)
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => stripTags(t))
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, text) => `[${stripTags(text)}](${href})`)
    .replace(/<[^>]+>/g, "")
    .trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}
