import { marked } from "marked";
import { processSeoBlocksInMarkdown } from "@/features/blog/seo-blocks";
import { sanitizeBlogHtml } from "@/features/blog/sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Block-level elements that own their own subtree. Anything between two of
 * these at top level is a "markdown island" that still needs conversion.
 */
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "dl",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "iframe",
  "main",
  "nav",
  "ol",
  "p",
  "picture",
  "pre",
  "script",
  "section",
  "style",
  "table",
  "ul",
  "video",
]);

const VOID_BLOCK_TAGS = new Set(["hr", "img"]);

const MARKDOWN_PATTERNS: RegExp[] = [
  /^\s{0,3}#{1,6}\s+\S/m, // ATX heading
  /^\s{0,3}[-*+]\s+\S/m, // bullet list
  /^\s{0,3}\d+\.\s+\S/m, // ordered list
  /^\s{0,3}>\s+\S/m, // blockquote
  /^\s{0,3}\|.+\|\s*$/m, // table row
  /!\[[^\]]*\]\([^)\s]+\)/, // image
  /\[[^\]\n]+\]\([^)\s]*\)/, // link
  /\*\*[^*\n]+\*\*/, // bold
  /^\s{0,3}```/m, // fenced code
  /:::(?:cta|faq)\b/, // ATTD SEO blocks
];

type ContentToken = { kind: "html" | "text"; value: string };

function findClosingIndex(input: string, openIndex: number, tag: string): number {
  const open = new RegExp(`<${tag}\\b`, "gi");
  const close = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 0;
  let cursor = openIndex;

  while (cursor < input.length) {
    open.lastIndex = cursor;
    close.lastIndex = cursor;
    const nextOpen = open.exec(input);
    const nextClose = close.exec(input);

    if (!nextClose) return input.length;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }

    depth -= 1;
    cursor = nextClose.index + nextClose[0].length;
    if (depth <= 0) return cursor;
  }

  return input.length;
}

/** Split a document into top-level HTML blocks and the loose text between them. */
function tokenizeContent(input: string): ContentToken[] {
  const tokens: ContentToken[] = [];
  const openTag = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*?)?(\/?)>/;
  let textStart = 0;
  let cursor = 0;

  while (cursor < input.length) {
    if (input[cursor] !== "<") {
      cursor += 1;
      continue;
    }

    const match = openTag.exec(input.slice(cursor));
    if (!match || match.index !== 0) {
      cursor += 1;
      continue;
    }

    const tag = match[1].toLowerCase();
    const isVoid = VOID_BLOCK_TAGS.has(tag);
    if (!BLOCK_TAGS.has(tag) && !isVoid) {
      cursor += match[0].length;
      continue;
    }

    if (cursor > textStart) {
      tokens.push({ kind: "text", value: input.slice(textStart, cursor) });
    }

    if (isVoid || match[3] === "/") {
      tokens.push({ kind: "html", value: match[0] });
      cursor += match[0].length;
    } else {
      const end = findClosingIndex(input, cursor, tag);
      tokens.push({ kind: "html", value: input.slice(cursor, end) });
      cursor = end;
    }

    textStart = cursor;
  }

  if (textStart < input.length) {
    tokens.push({ kind: "text", value: input.slice(textStart) });
  }

  return tokens;
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function isHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content.trim());
}

/**
 * True when the document still carries markdown syntax that would render as
 * literal text (e.g. `## Heading` sitting outside any HTML block).
 */
export function hasMarkdownLeak(content: string | null | undefined): boolean {
  if (!content?.trim()) return false;
  return tokenizeContent(content).some(
    (token) =>
      token.kind === "text" &&
      token.value.trim().length > 0 &&
      MARKDOWN_PATTERNS.some((pattern) => pattern.test(token.value))
  );
}

/**
 * Convert markdown that survives inside an otherwise-HTML document.
 * Existing HTML blocks are copied verbatim, so anchor ids, FAQ markup,
 * internal links and media references are preserved byte for byte.
 */
export function normalizeMarkdownIslands(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const tokens = tokenizeContent(trimmed);
  const hasHtmlBlock = tokens.some((token) => token.kind === "html");

  if (!hasHtmlBlock) {
    return markdownToHtml(processSeoBlocksInMarkdown(trimmed)).trim();
  }

  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === "html") {
      parts.push(token.value.trim());
      continue;
    }
    if (!token.value.trim()) continue;
    const converted = markdownToHtml(processSeoBlocksInMarkdown(token.value)).trim();
    if (converted) parts.push(converted);
  }

  return parts.filter(Boolean).join("\n").trim();
}

/** Canonical entry point: whatever an editor or a handoff produces, store clean HTML. */
export function normalizeBlogContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return sanitizeBlogHtml(normalizeMarkdownIslands(trimmed));
}
