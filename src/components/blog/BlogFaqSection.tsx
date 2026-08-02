import type { BlogFaqItem } from "@/features/blog/types";

type BlogFaqSectionProps = {
  items: BlogFaqItem[];
};

/**
 * Renders the canonical FAQ from `faqJson`, the same source `FaqSchema` uses,
 * so the visible questions and the FAQ JSON-LD can never disagree.
 *
 * `<details>` gives button semantics, `aria-expanded` and keyboard support for
 * free, so no client JavaScript is needed here.
 */
export default function BlogFaqSection({ items }: BlogFaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="blog-faq" aria-labelledby="blog-faq-title">
      <h2 className="blog-faq-title" id="blog-faq-title">
        Câu hỏi thường gặp
      </h2>
      <div className="blog-faq-list">
        {items.map((item, index) => (
          <details key={`${item.question}-${index}`} className="blog-faq-item">
            <summary className="blog-faq-question">
              <span className="blog-faq-question-text">{item.question}</span>
              <span className="blog-faq-indicator" aria-hidden="true" />
            </summary>
            <div className="blog-faq-answer">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
