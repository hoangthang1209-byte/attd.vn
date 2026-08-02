/**
 * The one CTA presentation used inside article bodies, whether the block came
 * from a `:::cta` snippet or from a bare conversion link the writer left in a
 * paragraph. Keeping the markup in one place means the public article, the
 * editor preview and the publishing preview cannot drift apart.
 */

export type ArticleCtaInput = {
  title?: string;
  body?: string;
  href?: string;
  buttonLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/** Destinations that turn a link-only paragraph into a conversion block. */
export const CONVERSION_HREFS = new Set(["/lien-he", "/bao-gia", "/dat-hang"]);

export const DEFAULT_CTA_TITLE = "Nhận tư vấn báo giá";
export const DEFAULT_CTA_BUTTON = "Liên hệ tư vấn";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderArticleCtaHtml(input: ArticleCtaInput): string {
  const title = escapeHtml(input.title?.trim() || DEFAULT_CTA_TITLE);
  const href = escapeHtml(input.href?.trim() || "/lien-he");
  const button = escapeHtml(input.buttonLabel?.trim() || DEFAULT_CTA_BUTTON);
  const body = input.body?.trim();

  const parts = [
    `<aside class="blog-cta-block" aria-label="${title}">`,
    `<p class="blog-cta-block__title">${title}</p>`,
  ];

  if (body) parts.push(`<p class="blog-cta-block__body">${body}</p>`);

  parts.push(
    `<a class="blog-cta-block__button" href="${href}">${button}</a>`,
  );

  if (input.secondaryHref && input.secondaryLabel) {
    parts.push(
      `<a class="blog-cta-block__secondary" href="${escapeHtml(input.secondaryHref)}">${escapeHtml(input.secondaryLabel)}</a>`,
    );
  }

  parts.push("</aside>");
  return parts.join("");
}
