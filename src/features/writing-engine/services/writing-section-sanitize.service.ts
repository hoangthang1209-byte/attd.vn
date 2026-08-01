import { countWords } from "@/features/writing-engine/writing-utils";

/** Attributes every allowed element may keep (anchor ids and block classes). */
const GLOBAL_ATTRS = ["class", "id"];

/**
 * Tag → extra allowed attributes. The allowlist deliberately keeps the
 * attributes that carry editorial meaning: anchor ids for the table of
 * contents, `href` for internal links, `src`/`alt` and `data-media-id` for
 * media references, and the wrapper classes used by FAQ and CTA blocks.
 */
const ALLOWED_TAGS = new Map<string, string[]>([
  ["p", []],
  ["strong", []],
  ["b", []],
  ["em", []],
  ["i", []],
  ["ul", []],
  ["ol", []],
  ["li", []],
  ["h2", []],
  ["h3", []],
  ["h4", []],
  ["a", ["href", "title", "target", "rel"]],
  ["figure", ["data-media-id"]],
  ["img", ["src", "alt", "width", "height", "loading"]],
  ["figcaption", []],
  ["br", []],
  ["hr", []],
  ["blockquote", []],
  ["table", []],
  ["thead", []],
  ["tbody", []],
  ["tfoot", []],
  ["tr", []],
  ["th", ["colspan", "rowspan", "scope"]],
  ["td", ["colspan", "rowspan"]],
  ["section", ["data-media-id"]],
  ["aside", []],
  ["details", ["open"]],
  ["summary", []],
  ["span", []],
  ["code", []],
  ["pre", []],
]);

const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;

function parseAttributes(raw: string): Array<{ name: string; value: string | null }> {
  const attrs: Array<{ name: string; value: string | null }> = [];
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const value = match[3] ?? match[4] ?? match[5] ?? null;
    attrs.push({ name: match[1].toLowerCase(), value });
  }
  return attrs;
}

function serializeAttributes(tag: string, raw: string): string {
  const allowed = new Set([...GLOBAL_ATTRS, ...(ALLOWED_TAGS.get(tag) ?? [])]);
  const parts: string[] = [];

  for (const attr of parseAttributes(raw)) {
    if (!allowed.has(attr.name)) continue;
    if (attr.value === null) {
      parts.push(attr.name);
      continue;
    }
    if ((attr.name === "href" || attr.name === "src") && UNSAFE_URL.test(attr.value)) {
      continue;
    }
    parts.push(`${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`);
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function sanitizeWritingSectionHtml(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:image\/[^;]+;base64,[^"'>\s]+/gi, "");

  // Strip disallowed tags but keep inner text.
  out = out.replace(/<(\/?)([a-z0-9]+)((?:\s[^>]*)?)(\/?)>/gi, (_match, closing: string, tag: string, attrs: string, selfClose: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;

    if (name === "a") {
      const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
      const url = href?.[2] ?? href?.[3] ?? "";
      if (!url || UNSAFE_URL.test(url)) return "";
    }

    const serialized = serializeAttributes(name, attrs);
    if (name === "img" || name === "br" || name === "hr" || selfClose) {
      return `<${name}${serialized} />`;
    }
    return `<${name}${serialized}>`;
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
