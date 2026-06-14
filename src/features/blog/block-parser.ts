export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "paragraph"
  | "image"
  | "faq"
  | "cta"
  | "list"
  | "table"
  | "quote"
  | "other";

export type ContentBlock = {
  id: string;
  type: BlockType;
  label: string;
  preview: string;
  start: number;
  end: number;
  raw: string;
};

function blockLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    h1: "H1",
    h2: "H2",
    h3: "H3",
    paragraph: "Đoạn văn",
    image: "Ảnh",
    faq: "FAQ",
    cta: "CTA",
    list: "Danh sách",
    table: "Bảng",
    quote: "Trích dẫn",
    other: "Khối",
  };
  return labels[type];
}

function classifyChunk(chunk: string): BlockType {
  const trimmed = chunk.trim();
  if (trimmed.startsWith("# ")) return "h1";
  if (trimmed.startsWith("## ")) return "h2";
  if (trimmed.startsWith("### ")) return "h3";
  if (trimmed.startsWith(":::faq")) return "faq";
  if (trimmed.startsWith(":::cta")) return "cta";
  if (/^!\[[^\]]*]\([^)]+\)/.test(trimmed)) return "image";
  if (/^>\s/.test(trimmed)) return "quote";
  if (/^\|.+\|/.test(trimmed)) return "table";
  if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return "list";
  return "paragraph";
}

function previewText(chunk: string, type: BlockType): string {
  const trimmed = chunk.trim();
  if (type === "h1") return trimmed.replace(/^#\s+/, "");
  if (type === "h2") return trimmed.replace(/^##\s+/, "");
  if (type === "h3") return trimmed.replace(/^###\s+/, "");
  if (type === "image") {
    const match = trimmed.match(/^!\[([^\]]*)]\([^)]+\)/);
    return match?.[1] || "Ảnh minh họa";
  }
  if (type === "faq") {
    const q = trimmed.match(/^Q:\s*(.+)$/im);
    return q?.[1] ?? "Câu hỏi thường gặp";
  }
  if (type === "cta") {
    const title = trimmed.match(/^title:\s*(.+)$/im);
    return title?.[1] ?? "Call to action";
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 80);
}

function splitMarkdownIntoChunks(markdown: string): { chunk: string; start: number; end: number }[] {
  if (!markdown.trim()) return [];

  const chunks: { chunk: string; start: number; end: number }[] = [];
  let index = 0;
  let buffer = "";
  let bufferStart = 0;

  function flushBuffer() {
    if (!buffer.trim()) {
      buffer = "";
      return;
    }
    chunks.push({ chunk: buffer.trimEnd(), start: bufferStart, end: index });
    buffer = "";
  }

  while (index < markdown.length) {
    const rest = markdown.slice(index);
    const faqMatch = rest.match(/^:::faq[\s\S]*?:::/);
    const ctaMatch = rest.match(/^:::cta[\s\S]*?:::/);

    if (faqMatch && (!ctaMatch || faqMatch.index === 0)) {
      flushBuffer();
      const block = faqMatch[0];
      chunks.push({ chunk: block, start: index, end: index + block.length });
      index += block.length;
      while (markdown[index] === "\n") index += 1;
      bufferStart = index;
      continue;
    }

    if (ctaMatch && ctaMatch.index === 0) {
      flushBuffer();
      const block = ctaMatch[0];
      chunks.push({ chunk: block, start: index, end: index + block.length });
      index += block.length;
      while (markdown[index] === "\n") index += 1;
      bufferStart = index;
      continue;
    }

    if (markdown[index] === "\n" && markdown[index + 1] === "\n") {
      flushBuffer();
      index += 2;
      bufferStart = index;
      continue;
    }

    if (!buffer) bufferStart = index;
    buffer += markdown[index];
    index += 1;
  }

  flushBuffer();
  return chunks;
}

export function parseMarkdownBlocks(markdown: string): ContentBlock[] {
  return splitMarkdownIntoChunks(markdown).map((item, blockIndex) => {
    const type = classifyChunk(item.chunk);
    return {
      id: `block-${blockIndex}-${item.start}`,
      type,
      label: blockLabel(type),
      preview: previewText(item.chunk, type),
      start: item.start,
      end: item.end,
      raw: item.chunk,
    };
  });
}

export function replaceBlock(
  markdown: string,
  block: ContentBlock,
  nextRaw: string
): string {
  const before = markdown.slice(0, block.start);
  const after = markdown.slice(block.end);
  const spacerBefore = before.length > 0 && !before.endsWith("\n\n") ? "\n\n" : "";
  const spacerAfter = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "";
  return `${before}${spacerBefore}${nextRaw.trim()}${spacerAfter}${after}`;
}

export function jumpToBlock(
  textarea: HTMLTextAreaElement,
  block: ContentBlock
): void {
  textarea.focus();
  textarea.setSelectionRange(block.start, block.end);
  textarea.scrollTop = Math.max(0, (block.start / markdownLength(textarea.value)) * textarea.scrollHeight - 80);
}

function markdownLength(value: string): number {
  return Math.max(value.length, 1);
}
