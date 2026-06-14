import Link from "next/link";
import type { BlogFaqItem } from "@/features/blog/types";

type BlogFaqSectionProps = {
  items: BlogFaqItem[];
};

export default function BlogFaqSection({ items }: BlogFaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="blog-faq">
      <h2 className="blog-faq-title">Câu hỏi thường gặp</h2>
      <div className="blog-faq-list">
        {items.map((item, index) => (
          <details key={`${item.question}-${index}`} className="blog-faq-item" open={index === 0}>
            <summary className="blog-faq-question">
              <span className="blog-faq-label">Q{index + 1}</span>
              {item.question}
            </summary>
            <div className="blog-faq-answer">
              <span className="blog-faq-label">A{index + 1}</span>
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
