import { CTA_BLOCK_SNIPPET, FAQ_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";

export type EditorCommandGroup = "text" | "media" | "structure" | "conversion";

export type EditorCommand = {
  id: string;
  label: string;
  hint: string;
  group: EditorCommandGroup;
  /** Extra search terms so "bang" also finds Table. */
  keywords: string[];
  snippet: string;
};

export const EDITOR_COMMAND_GROUP_LABELS: Record<EditorCommandGroup, string> = {
  text: "Văn bản",
  structure: "Bố cục",
  media: "Media",
  conversion: "Chuyển đổi",
};

/**
 * Every command produces markup the existing pipeline already renders:
 * markdown that `marked` understands, or HTML that survives
 * `sanitizeBlogHtml`. Nothing here introduces a new render path.
 */
export const EDITOR_COMMANDS: EditorCommand[] = [
  {
    id: "heading",
    label: "Heading",
    hint: "Tiêu đề mục (H2)",
    group: "text",
    keywords: ["h2", "tieu de", "heading", "title"],
    snippet: "## Tiêu đề\n\n",
  },
  {
    id: "subheading",
    label: "Subheading",
    hint: "Tiêu đề phụ (H3)",
    group: "text",
    keywords: ["h3", "tieu de phu", "subheading"],
    snippet: "### Tiêu đề\n\n",
  },
  {
    id: "paragraph",
    label: "Paragraph",
    hint: "Đoạn văn thường",
    group: "text",
    keywords: ["p", "doan van", "text", "paragraph"],
    snippet: "Viết nội dung đoạn văn...\n\n",
  },
  {
    id: "list",
    label: "List",
    hint: "Danh sách gạch đầu dòng",
    group: "text",
    keywords: ["ul", "bullet", "danh sach", "list"],
    snippet: "- Mục 1\n- Mục 2\n- Mục 3\n\n",
  },
  {
    id: "quote",
    label: "Quote",
    hint: "Trích dẫn",
    group: "text",
    keywords: ["blockquote", "trich dan", "quote"],
    snippet: "> Trích dẫn quan trọng\n\n",
  },
  {
    id: "code",
    label: "Code",
    hint: "Khối mã",
    group: "text",
    keywords: ["code", "pre", "ma nguon"],
    snippet: "```\nnội dung mã\n```\n\n",
  },
  {
    id: "callout",
    label: "Callout",
    hint: "Hộp lưu ý nổi bật",
    group: "structure",
    keywords: ["note", "luu y", "callout", "info"],
    snippet:
      '<aside class="blog-callout"><p><strong>Lưu ý:</strong> Nội dung cần nhấn mạnh.</p></aside>\n\n',
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Đường phân cách",
    group: "structure",
    keywords: ["hr", "divider", "phan cach"],
    snippet: "\n---\n\n",
  },
  {
    id: "table",
    label: "Table",
    hint: "Bảng so sánh",
    group: "structure",
    keywords: ["bang", "table", "grid"],
    snippet: "| Cột 1 | Cột 2 |\n| --- | --- |\n| Giá trị | Giá trị |\n\n",
  },
  {
    id: "image",
    label: "Image",
    hint: "Ảnh đơn",
    group: "media",
    keywords: ["anh", "image", "img", "hinh"],
    snippet: "![Mô tả ảnh](image-url)\n\n",
  },
  {
    id: "gallery",
    label: "Gallery",
    hint: "Nhóm 3 ảnh",
    group: "media",
    keywords: ["gallery", "thu vien", "anh", "grid"],
    snippet:
      '<div class="blog-gallery">\n' +
      '  <figure><img src="image-url-1" alt="Mô tả ảnh 1" /></figure>\n' +
      '  <figure><img src="image-url-2" alt="Mô tả ảnh 2" /></figure>\n' +
      '  <figure><img src="image-url-3" alt="Mô tả ảnh 3" /></figure>\n' +
      "</div>\n\n",
  },
  {
    id: "video",
    label: "Video",
    hint: "Liên kết video ngoài",
    group: "media",
    keywords: ["video", "youtube", "clip"],
    snippet:
      '<figure class="blog-video"><a href="https://www.youtube.com/watch?v=" target="_blank" rel="noopener noreferrer">Xem video</a><figcaption>Mô tả video</figcaption></figure>\n\n',
  },
  {
    id: "cta",
    label: "CTA",
    hint: "Khối kêu gọi hành động",
    group: "conversion",
    keywords: ["cta", "call to action", "bao gia"],
    snippet: `${CTA_BLOCK_SNIPPET}\n\n`,
  },
  {
    id: "button",
    label: "Button",
    hint: "Nút liên kết đơn",
    group: "conversion",
    keywords: ["button", "nut", "link"],
    snippet: '<a class="blog-cta-block__button" href="/lien-he">Liên hệ ATTD</a>\n\n',
  },
  {
    id: "faq",
    label: "FAQ",
    hint: "Câu hỏi thường gặp trong bài",
    group: "conversion",
    keywords: ["faq", "cau hoi", "question"],
    snippet: `${FAQ_BLOCK_SNIPPET}\n\n`,
  },
];

/** Diacritic-insensitive so "tieu de" matches "Tiêu đề". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function filterEditorCommands(query: string): EditorCommand[] {
  const needle = fold(query.trim());
  if (!needle) return EDITOR_COMMANDS;

  return EDITOR_COMMANDS.filter((command) => {
    if (fold(command.label).includes(needle)) return true;
    if (fold(command.hint).includes(needle)) return true;
    return command.keywords.some((keyword) => fold(keyword).includes(needle));
  });
}
