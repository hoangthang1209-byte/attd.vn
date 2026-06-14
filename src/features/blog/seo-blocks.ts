function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseKeyValueBlock(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const match = line.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (match) {
      fields[match[1].toLowerCase()] = match[2].trim();
    }
  }
  return fields;
}

function renderCtaHtml(fields: Record<string, string>): string {
  const title = escapeHtml(fields.title ?? "Liên hệ ATTD");
  const button = escapeHtml(fields.button ?? "Liên hệ ngay");
  const url = escapeHtml(fields.url ?? "/lien-he");
  return `<aside class="blog-cta-block"><h3 class="blog-cta-block__title">${title}</h3><a href="${url}" class="blog-cta-block__button">${button}</a></aside>`;
}

function renderFaqBlockHtml(body: string): string {
  const pairs: { question: string; answer: string }[] = [];
  let currentQuestion = "";
  let currentAnswer = "";

  for (const line of body.split("\n")) {
    const qMatch = line.match(/^Q:\s*(.+)$/i);
    const aMatch = line.match(/^A:\s*(.+)$/i);
    if (qMatch) {
      if (currentQuestion && currentAnswer) {
        pairs.push({ question: currentQuestion, answer: currentAnswer });
      }
      currentQuestion = qMatch[1].trim();
      currentAnswer = "";
      continue;
    }
    if (aMatch) {
      currentAnswer = aMatch[1].trim();
    }
  }

  if (currentQuestion && currentAnswer) {
    pairs.push({ question: currentQuestion, answer: currentAnswer });
  }

  if (pairs.length === 0) return "";

  const items = pairs
    .map(
      (pair) =>
        `<details class="blog-inline-faq__item" open><summary>${escapeHtml(pair.question)}</summary><p>${escapeHtml(pair.answer)}</p></details>`
    )
    .join("");

  return `<section class="blog-inline-faq"><h3 class="blog-inline-faq__title">Câu hỏi thường gặp</h3>${items}</section>`;
}

export function processSeoBlocksInMarkdown(markdown: string): string {
  return markdown
    .replace(/:::cta\n([\s\S]*?):::/g, (_, body: string) => renderCtaHtml(parseKeyValueBlock(body)))
    .replace(/:::faq\n([\s\S]*?):::/g, (_, body: string) => renderFaqBlockHtml(body));
}

export const CTA_BLOCK_SNIPPET = `:::cta
title: Nhận báo giá OEM
button: Liên hệ ATTD
url: /lien-he
:::`;

export const FAQ_BLOCK_SNIPPET = `:::faq
Q: Câu hỏi mẫu?
A: Câu trả lời mẫu.
:::`;
