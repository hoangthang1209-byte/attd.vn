import { createHash } from "node:crypto";
import {
  deriveSectionMediaIntent,
} from "@/features/content/inline-media/section-media-intent";
import type { ArticleSectionRef } from "@/features/content/inline-media/inline-media.types";

/**
 * Parse H2/H3 sections from article HTML for placement planning.
 * Section ids are stable hashes of the folded heading so they survive
 * heading-id regeneration.
 */
export function parseArticleSections(html: string): ArticleSectionRef[] {
  const headingPattern = /<(h[23])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const matches = [...html.matchAll(headingPattern)];
  const sections: ArticleSectionRef[] = [];

  matches.forEach((match, index) => {
    const tag = match[1].toLowerCase();
    const level = tag === "h2" ? 2 : 3;
    const text = stripTags(match[3]).trim();
    if (!text) return;

    const headingStart = match.index ?? 0;
    const afterHeadingIndex = headingStart + match[0].length;
    const next = matches[index + 1];
    const sectionEndIndex = next?.index ?? html.length;
    const body = html.slice(afterHeadingIndex, sectionEndIndex);
    const textLength = stripTags(body).replace(/\s+/g, " ").trim().length;
    const derived = deriveSectionMediaIntent({ heading: text });

    sections.push({
      id: sectionIdFromHeading(text),
      heading: text,
      level,
      textLength,
      headingStart,
      afterHeadingIndex,
      sectionEndIndex,
      intent: derived.intent,
      excluded: derived.excluded || level === 3 && derived.intent === "EXCLUDE",
    });
  });

  return sections;
}

export function sectionIdFromHeading(heading: string): string {
  const folded = heading
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "section";
  const hash = createHash("sha1").update(folded).digest("hex").slice(0, 8);
  return `sec_${folded}_${hash}`;
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Insert a figure HTML snippet into the article at the section's preferred
 * position. Returns the new HTML; never mutates input.
 */
export function insertFigureIntoHtml(
  html: string,
  section: ArticleSectionRef,
  figureHtml: string,
  position: "AFTER_HEADING" | "AFTER_INTRO" | "BETWEEN_PARAGRAPHS" | "BEFORE_CTA",
): string {
  // Re-locate the section by heading text in case offsets drifted.
  const headingPattern = new RegExp(
    `<(h[23])\\b[^>]*>\\s*${escapeRegExp(section.heading)}\\s*<\\/\\1>`,
    "i",
  );
  const match = headingPattern.exec(html);
  if (!match || match.index == null) {
    // Fallback: append before the last CTA-ish heading or at end.
    return `${html.trim()}\n${figureHtml}\n`;
  }

  const afterHeading = match.index + match[0].length;
  const rest = html.slice(afterHeading);
  const nextHeading = rest.search(/<h[23]\b/i);
  const sectionBody = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const sectionTailStart = afterHeading + (nextHeading >= 0 ? nextHeading : rest.length);

  let insertAt = afterHeading;

  if (position === "AFTER_INTRO" || position === "BETWEEN_PARAGRAPHS") {
    const firstParagraphClose = sectionBody.search(/<\/p>/i);
    if (firstParagraphClose >= 0) {
      insertAt = afterHeading + firstParagraphClose + 4;
    }
  } else if (position === "BEFORE_CTA") {
    insertAt = sectionTailStart;
  }

  return `${html.slice(0, insertAt)}\n${figureHtml}\n${html.slice(insertAt)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
