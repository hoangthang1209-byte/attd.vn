import { countWords } from "@/features/writing-engine/writing-utils";

const ALLOWED_TAGS = new Set([
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "a",
  "figure",
  "img",
  "figcaption",
  "br",
]);

export function sanitizeWritingSectionHtml(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:image\/[^;]+;base64,[^"'>\s]+/gi, "");

  // Strip disallowed tags but keep inner text.
  out = out.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (name === "a") {
      const href = match.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
      const url = href?.[2] ?? href?.[3] ?? "";
      if (!url || url.startsWith("javascript:") || url.startsWith("data:")) return "";
      const textMatch = match.startsWith("</") ? match : null;
      if (textMatch) return "</a>";
      return `<a href="${url.replace(/"/g, "")}">`;
    }
    if (name === "img") {
      const alt = match.match(/alt\s*=\s*("([^"]*)"|'([^']*)')/i);
      const altText = alt?.[2] ?? alt?.[3] ?? "";
      return match.startsWith("</") ? "" : `<img alt="${altText.replace(/"/g, "")}" />`;
    }
    if (match.startsWith("</")) return `</${name}>`;
    return `<${name}>`;
  });

  return out.trim();
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ensureWordCount(draftPlain: string, reported: number): number {
  const actual = countWords(draftPlain);
  return actual > 0 ? actual : reported;
}
