import { normalizeMarkdownIslands } from "@/features/blog/content-normalizer";
import type { WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";
import { stripUnsafeHtml } from "@/features/writing-engine/writing-utils";

/** Section bodies come from a model: convert any markdown it emitted to HTML. */
function renderSectionBody(html: string): string {
  return stripUnsafeHtml(normalizeMarkdownIslands(html));
}

export function renderWritingDraftHtml(draft: WritingStructuredDraft): string {
  const parts: string[] = [];
  parts.push(`<h1>${escapeHtml(draft.title)}</h1>`);

  for (const section of draft.sections) {
    const level = Math.min(3, 2);
    parts.push(`<h${level}>${escapeHtml(section.heading)}</h${level}>`);
    parts.push(renderSectionBody(section.html));
  }

  if (draft.faq.length > 0) {
    parts.push("<h2>Câu hỏi thường gặp</h2>");
    for (const item of draft.faq) {
      parts.push(`<h3>${escapeHtml(item.question)}</h3>`);
      parts.push(renderSectionBody(item.answerHtml));
    }
  }

  if (draft.cta.primary.text) {
    const href = draft.cta.primary.destination ?? "/lien-he";
    parts.push(
      `<p class="writing-cta"><a href="${escapeAttr(href)}">${escapeHtml(draft.cta.primary.text)}</a></p>`
    );
  }

  for (const media of draft.media.filter((m) => m.placement === "FEATURED" || m.placement === "COVER")) {
    parts.push(
      `<figure data-media-id="${escapeAttr(media.mediaAssetId)}"><figcaption>${escapeHtml(media.caption ?? media.altText)}</figcaption></figure>`
    );
  }

  return stripUnsafeHtml(parts.join("\n"));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
