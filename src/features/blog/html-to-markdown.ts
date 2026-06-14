import { isHtmlContent } from "@/features/blog/markdown";

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const childText = Array.from(el.childNodes).map(nodeToMarkdown).join("");

  switch (tag) {
    case "h1":
      return `\n# ${childText.trim()}\n\n`;
    case "h2":
      return `\n## ${childText.trim()}\n\n`;
    case "h3":
      return `\n### ${childText.trim()}\n\n`;
    case "h4":
      return `\n#### ${childText.trim()}\n\n`;
    case "p":
      return `${childText.trim()}\n\n`;
    case "strong":
    case "b":
      return `**${childText.trim()}**`;
    case "em":
    case "i":
      return `*${childText.trim()}*`;
    case "blockquote":
      return `\n> ${childText.trim().replace(/\n/g, "\n> ")}\n\n`;
    case "ul":
      return `\n${Array.from(el.children)
        .map((li) => `- ${nodeToMarkdown(li).trim()}`)
        .join("\n")}\n\n`;
    case "ol":
      return `\n${Array.from(el.children)
        .map((li, index) => `${index + 1}. ${nodeToMarkdown(li).trim()}`)
        .join("\n")}\n\n`;
    case "li":
      return childText.trim();
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[${childText.trim() || href}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "Ảnh minh họa";
      return `![${alt}](${src})\n\n`;
    }
    case "pre":
      return `\n\`\`\`\n${el.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
    case "code":
      return `\`${el.textContent?.trim() ?? ""}\``;
    case "br":
      return "\n";
    case "table":
      return tableToMarkdown(el);
    case "aside":
      if (el.classList.contains("blog-cta-block")) {
        return ctaBlockToMarkdown(el);
      }
      return childText;
    case "section":
      if (el.classList.contains("blog-inline-faq")) {
        return faqBlockToMarkdown(el);
      }
      return childText;
    case "div":
    case "article":
    case "main":
    case "body":
      return childText;
    default:
      return childText;
  }
}

function tableToMarkdown(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return "";

  const markdownRows = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
      (cell.textContent ?? "").trim().replace(/\|/g, "\\|")
    );
    return `| ${cells.join(" | ")} |`;
  });

  const colCount = rows[0]?.querySelectorAll("th, td").length ?? 0;
  if (colCount > 0 && markdownRows.length > 0) {
    markdownRows.splice(1, 0, `| ${Array(colCount).fill("---").join(" | ")} |`);
  }

  return `\n${markdownRows.join("\n")}\n\n`;
}

function ctaBlockToMarkdown(el: HTMLElement): string {
  const title =
    el.querySelector(".blog-cta-block__title")?.textContent?.trim() ??
    el.querySelector("h3")?.textContent?.trim() ??
    "Liên hệ ATTD";
  const link = el.querySelector("a");
  const button = link?.textContent?.trim() ?? "Liên hệ ngay";
  const url = link?.getAttribute("href") ?? "/lien-he";
  return `\n:::cta\ntitle: ${title}\nbutton: ${button}\nurl: ${url}\n:::\n\n`;
}

function faqBlockToMarkdown(el: HTMLElement): string {
  const items = Array.from(el.querySelectorAll(".blog-inline-faq__item, details"));
  if (items.length === 0) return "";

  const body = items
    .map((item) => {
      const question =
        item.querySelector("summary")?.textContent?.trim() ??
        item.querySelector(".blog-faq-question")?.textContent?.trim() ??
        "";
      const answer =
        item.querySelector("p")?.textContent?.trim() ??
        item.querySelector(".blog-faq-answer p")?.textContent?.trim() ??
        "";
      return `Q: ${question}\nA: ${answer}`;
    })
    .join("\n");

  return `\n:::faq\n${body}\n:::\n\n`;
}

function htmlFallbackToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToMarkdown(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof document === "undefined") {
    return htmlFallbackToMarkdown(trimmed);
  }

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const markdown = nodeToMarkdown(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown || htmlFallbackToMarkdown(trimmed);
}

export function contentToEditorMarkdown(content: string | null | undefined): string {
  if (!content?.trim()) return "";
  if (isHtmlContent(content)) return htmlToMarkdown(content);
  return content;
}
