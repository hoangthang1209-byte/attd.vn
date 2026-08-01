"use client";

import { useState } from "react";
import type { BlogFaqItem } from "@/features/blog/types";

type BlogFaqBuilderProps = {
  items: BlogFaqItem[];
  onChange: (items: BlogFaqItem[]) => void;
};

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function BlogFaqBuilder({ items, onChange }: BlogFaqBuilderProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateItem(index: number, field: keyof BlogFaqItem, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    onChange([...items, { question: "", answer: "" }]);
    setExpanded(items.length);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setExpanded(null);
  }

  function reorder(from: number, to: number) {
    const next = move(items, from, to);
    if (next !== items) onChange(next);
  }

  return (
    <div className="admin-faq-builder">
      <div className="admin-faq-builder-header">
        <p className="admin-field-hint" style={{ margin: 0 }}>
          Kéo để đổi thứ tự · nhấn để mở
        </p>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={addItem}>
          Add FAQ
        </button>
      </div>

      {items.length === 0 ? (
        <p className="admin-field-hint">Chưa có FAQ. Thêm câu hỏi để tăng SEO score.</p>
      ) : (
        <ul className="admin-faq-rows">
          {items.map((item, index) => (
            <li
              key={`faq-${index}`}
              className={`admin-faq-row ${dragIndex === index ? "is-dragging" : ""}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                setDragIndex(null);
              }}
            >
              <div className="admin-faq-row__head">
                <span className="admin-faq-row__handle" aria-hidden="true">
                  ⋮⋮
                </span>
                <button
                  type="button"
                  className="admin-faq-row__title"
                  aria-expanded={expanded === index}
                  onClick={() => setExpanded((current) => (current === index ? null : index))}
                >
                  <span>{item.question.trim() || `Câu hỏi ${index + 1}`}</span>
                  <span aria-hidden="true">{expanded === index ? "▾" : "▸"}</span>
                </button>
                <div className="admin-faq-row__moves">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => reorder(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Chuyển câu hỏi ${index + 1} lên`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => reorder(index, index + 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Chuyển câu hỏi ${index + 1} xuống`}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {expanded === index && (
                <div className="admin-faq-row__body">
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
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => removeItem(index)}
                  >
                    Delete FAQ
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
