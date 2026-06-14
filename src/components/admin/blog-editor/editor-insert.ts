import type { ContentBlock } from "@/features/blog/block-parser";

export function insertSnippetIntoMarkdown(
  value: string,
  snippet: string,
  selectedBlock: ContentBlock | null
): string {
  if (selectedBlock) {
    const before = value.slice(0, selectedBlock.end);
    const after = value.slice(selectedBlock.end);
    const spacer = before.length > 0 && !before.endsWith("\n\n") ? "\n\n" : "";
    return `${before}${spacer}${snippet}${after}`;
  }

  if (!value.trim()) return snippet;
  const spacer = value.endsWith("\n\n") ? "" : "\n\n";
  return `${value}${spacer}${snippet}`;
}

export function replaceContentWithConfirmation(
  current: string,
  next: string,
  emptyOnly = false
): string | null {
  if (!current.trim()) return next;
  if (emptyOnly) {
    const proceed = window.confirm("Thay thế toàn bộ nội dung hiện tại bằng template SEO?");
    return proceed ? next : null;
  }
  const proceed = window.confirm("Thay thế toàn bộ nội dung hiện tại?");
  return proceed ? next : null;
}
