"use client";

import type { BlogFaqItem } from "@/features/blog/types";

type BlogFaqBuilderProps = {
  items: BlogFaqItem[];
  onChange: (items: BlogFaqItem[]) => void;
};

export default function BlogFaqBuilder({ items, onChange }: BlogFaqBuilderProps) {
  function updateItem(index: number, field: keyof BlogFaqItem, value: string) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    onChange([...items, { question: "", answer: "" }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="admin-faq-builder">
      <div className="admin-faq-builder-header">
        <h3 className="admin-sidebar-title">FAQ Builder</h3>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={addItem}>
          Add FAQ
        </button>
      </div>

      {items.length === 0 ? (
        <p className="admin-field-hint">Chưa có FAQ. Thêm câu hỏi để tăng SEO score.</p>
      ) : (
        <div className="admin-faq-list">
          {items.map((item, index) => (
            <div key={`faq-${index}`} className="admin-faq-item">
              <div className="admin-field">
                <label className="admin-label">Question</label>
                <input
                  className="admin-input"
                  value={item.question}
                  onChange={(e) => updateItem(index, "question", e.target.value)}
                  placeholder="Câu hỏi thường gặp..."
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Answer</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={item.answer}
                  onChange={(e) => updateItem(index, "answer", e.target.value)}
                  placeholder="Câu trả lời..."
                />
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => removeItem(index)}
              >
                Delete FAQ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
