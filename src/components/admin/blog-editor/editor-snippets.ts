import { CTA_BLOCK_SNIPPET, FAQ_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";

export type EditorSnippet = {
  id: string;
  label: string;
  snippet: string;
};

export const QUICK_INSERT_SNIPPETS: EditorSnippet[] = [
  { id: "h2", label: "+ H2", snippet: "## Tiêu đề\n\n" },
  { id: "h3", label: "+ H3", snippet: "### Tiêu đề\n\n" },
  { id: "paragraph", label: "+ Đoạn văn", snippet: "Viết nội dung đoạn văn...\n\n" },
  { id: "ul", label: "+ Danh sách", snippet: "- Mục 1\n- Mục 2\n- Mục 3\n\n" },
  { id: "image", label: "+ Ảnh", snippet: "![Mô tả ảnh](image-url)\n\n" },
  { id: "cta", label: "+ CTA", snippet: `${CTA_BLOCK_SNIPPET}\n\n` },
  { id: "faq", label: "+ FAQ", snippet: `${FAQ_BLOCK_SNIPPET}\n\n` },
  {
    id: "table",
    label: "+ Bảng",
    snippet: "| Cột 1 | Cột 2 |\n| --- | --- |\n| Giá trị | Giá trị |\n\n",
  },
];

export const EDITOR_SNIPPETS: EditorSnippet[] = [
  { id: "h1", label: "H1", snippet: "# Tiêu đề\n\n" },
  { id: "h2", label: "H2", snippet: "## Tiêu đề\n\n" },
  { id: "h3", label: "H3", snippet: "### Tiêu đề\n\n" },
  { id: "bold", label: "Bold", snippet: "**in đậm**" },
  { id: "italic", label: "Italic", snippet: "*in nghiêng*" },
  { id: "ul", label: "Bullet List", snippet: "- Mục 1\n- Mục 2\n- Mục 3\n\n" },
  { id: "ol", label: "Number List", snippet: "1. Mục 1\n2. Mục 2\n3. Mục 3\n\n" },
  { id: "quote", label: "Quote", snippet: "> Trích dẫn quan trọng\n\n" },
  {
    id: "table",
    label: "Table",
    snippet: "| Cột 1 | Cột 2 |\n| --- | --- |\n| Giá trị | Giá trị |\n\n",
  },
  { id: "link", label: "Link", snippet: "[Nhãn liên kết](https://www.attd.vn/)" },
  { id: "image", label: "Image", snippet: "![Mô tả ảnh](image-url)\n\n" },
  { id: "cta", label: "CTA", snippet: `${CTA_BLOCK_SNIPPET}\n\n` },
  { id: "faq", label: "FAQ", snippet: `${FAQ_BLOCK_SNIPPET}\n\n` },
];

export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  value: string,
  snippet: string
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;

  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + snippet.length;
    textarea.setSelectionRange(pos, pos);
  });

  return next;
}
