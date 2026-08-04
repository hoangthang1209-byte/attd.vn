/**
 * Sprint 16.1 — pure text-diff helpers for the inline AI proposal panel.
 *
 * No React, no network, no DOM APIs beyond string methods — safe to unit
 * test with `node --test` and safe to run on the client for previewing an
 * AI proposal against the current section content.
 */

export type DiffLineType = "equal" | "insert" | "delete" | "change";

export type DiffLine = {
  type: DiffLineType;
  originalText?: string;
  proposalText?: string;
};

type SequenceOp = { type: "equal" | "insert" | "delete"; token: string };

/**
 * Classic O(n*m) LCS backtrack. Section-level text (a handful of paragraphs)
 * never gets large enough for this to matter; if that changes, swap in a
 * Myers diff without touching the public API below.
 */
function lcsOps(a: string[], b: string[]): SequenceOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: SequenceOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", token: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "delete", token: a[i] });
      i++;
    } else {
      ops.push({ type: "insert", token: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "delete", token: a[i] });
    i++;
  }
  while (j < m) {
    ops.push({ type: "insert", token: b[j] });
    j++;
  }
  return ops;
}

/**
 * Groups raw equal/insert/delete ops into display-ready DiffLines, pairing
 * consecutive delete+insert runs into "change" entries (a modified
 * line/word) instead of showing a delete immediately followed by an insert.
 */
function toDiffLines(ops: SequenceOp[]): DiffLine[] {
  const result: DiffLine[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op.type === "equal") {
      result.push({ type: "equal", originalText: op.token, proposalText: op.token });
      i++;
      continue;
    }

    const deletes: string[] = [];
    while (i < ops.length && ops[i].type === "delete") {
      deletes.push(ops[i].token);
      i++;
    }
    const inserts: string[] = [];
    while (i < ops.length && ops[i].type === "insert") {
      inserts.push(ops[i].token);
      i++;
    }

    const pairCount = Math.min(deletes.length, inserts.length);
    for (let k = 0; k < pairCount; k++) {
      result.push({ type: "change", originalText: deletes[k], proposalText: inserts[k] });
    }
    for (let k = pairCount; k < deletes.length; k++) {
      result.push({ type: "delete", originalText: deletes[k] });
    }
    for (let k = pairCount; k < inserts.length; k++) {
      result.push({ type: "insert", proposalText: inserts[k] });
    }
  }
  return result;
}

function splitLines(text: string): string[] {
  if (!text) return [];
  return text.split(/\r\n|\r|\n/);
}

/** Line-level diff — the default view for section HTML/plain-text proposals. */
export function computeLineDiff(original: string, proposal: string): DiffLine[] {
  return toDiffLines(lcsOps(splitLines(original ?? ""), splitLines(proposal ?? "")));
}

/**
 * Word-level diff, useful for short strings (meta title, CTA text, FAQ
 * question) where a line-level diff would just show one giant "change".
 */
export function computeWordDiff(original: string, proposal: string): DiffLine[] {
  const splitWords = (text: string) => (text ?? "").split(/\s+/).filter((w) => w.length > 0);
  return toDiffLines(lcsOps(splitWords(original), splitWords(proposal)));
}

const BLOCK_TAG_PATTERN = /<\/(p|div|li|h[1-6]|tr|blockquote)>|<br\s*\/?>/gi;

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/**
 * Strips HTML tags for diffing/plain-text display. This is intentionally
 * "light" — it is only used to compute a readable diff, never to sanitize
 * content that gets persisted (that still goes through the governed
 * writing-engine HTML sanitizer).
 */
export function htmlToPlainForDiff(html: string): string {
  if (!html) return "";
  const withBreaks = html.replace(BLOCK_TAG_PATTERN, "\n");
  const withoutTags = withBreaks.replace(/<[^>]*>/g, "");
  const decoded = withoutTags.replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);

  return decoded
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1]?.length > 0))
    .join("\n")
    .trim();
}
