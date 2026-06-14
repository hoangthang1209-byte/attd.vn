import type { BlogFaqItem } from "@/features/blog/types";

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, "").trim());
}

function uniqueHeadingId(base: string, used: Set<string>): string {
  let id = base || "section";
  let suffix = 1;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function headingIdFromText(text: string, used: Set<string>): string {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return uniqueHeadingId(normalized, used);
}

export function extractHeadings(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const regex = /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const level = match[1].toLowerCase() === "h2" ? 2 : 3;
    const attrs = match[2] ?? "";
    const text = stripTags(match[3] ?? "");
    if (!text) continue;

    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    headings.push({
      id: idMatch?.[1] ?? headingIdFromText(text, new Set(headings.map((h) => h.id))),
      text,
      level,
    });
  }

  return headings;
}

export function addHeadingIds(html: string): { html: string; headings: TocHeading[] } {
  const usedIds = new Set<string>();
  const headings: TocHeading[] = [];

  const processed = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, inner: string) => {
      const level = tag.toLowerCase() === "h2" ? 2 : 3;
      const text = stripTags(inner);
      if (!text) return full;

      const existingId = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
      const id = existingId ?? headingIdFromText(text, usedIds);
      if (existingId) usedIds.add(existingId);

      headings.push({ id, text, level });

      const attrsWithoutId = attrs.replace(/\sid=["'][^"']*["']/i, "");
      return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
    }
  );

  return { html: processed, headings };
}

export function countH2(html: string): number {
  return (html.match(/<h2[\s>]/gi) ?? []).length;
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function countWordsFromHtml(html: string): number {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function parseFaqJson(value: unknown): BlogFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = typeof row.question === "string" ? row.question.trim() : "";
      const answer = typeof row.answer === "string" ? row.answer.trim() : "";
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is BlogFaqItem => item !== null);
}

export function parseTagsJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

export function tagMatchesFilter(tag: string, filter: string): boolean {
  return tagToSlug(tag) === tagToSlug(filter);
}
