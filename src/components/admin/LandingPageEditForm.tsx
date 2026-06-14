"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LandingPageFaqItem } from "@/features/landing-pages/types";

type Props = {
  slug: string;
  initial: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    heroTitle: string;
    heroDescription: string;
    seoContent: string;
    faqJson: LandingPageFaqItem[];
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    isPublished: boolean;
  };
  readOnly?: boolean;
};

export default function LandingPageEditForm({ slug, initial, readOnly = false }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [faqText, setFaqText] = useState(JSON.stringify(initial.faqJson, null, 2));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setMessage(null);

    let faqJson: LandingPageFaqItem[] = [];
    try {
      const parsed = JSON.parse(faqText);
      if (!Array.isArray(parsed)) {
        setMessage({ type: "error", text: "FAQ phải là mảng JSON" });
        return;
      }
      faqJson = parsed;
    } catch {
      setMessage({ type: "error", text: "FAQ JSON không hợp lệ" });
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/landing-pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, faqJson }),
    });
    setLoading(false);

    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    setMessage({ type: "success", text: "✓ Đã lưu landing page" });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="admin-branding-fieldset">
        <p className="admin-field-hint">
          Slug: <code>{slug}</code> · URL: <code>/{slug}</code>
        </p>

        <div className="admin-form-group">
          <label htmlFor="title">Title (admin)</label>
          <input
            id="title"
            className="admin-input"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="metaTitle">Meta Title</label>
          <input
            id="metaTitle"
            className="admin-input"
            value={form.metaTitle}
            onChange={(e) => updateField("metaTitle", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="metaDescription">Meta Description</label>
          <textarea
            id="metaDescription"
            className="admin-input admin-textarea"
            rows={3}
            value={form.metaDescription}
            onChange={(e) => updateField("metaDescription", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroTitle">Hero Title</label>
          <input
            id="heroTitle"
            className="admin-input"
            value={form.heroTitle}
            onChange={(e) => updateField("heroTitle", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="heroDescription">Hero Description</label>
          <textarea
            id="heroDescription"
            className="admin-input admin-textarea"
            rows={4}
            value={form.heroDescription}
            onChange={(e) => updateField("heroDescription", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="seoContent">SEO Content (HTML)</label>
          <textarea
            id="seoContent"
            className="admin-input admin-textarea"
            rows={12}
            value={form.seoContent}
            onChange={(e) => updateField("seoContent", e.target.value)}
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="faqJson">FAQ (JSON)</label>
          <textarea
            id="faqJson"
            className="admin-input admin-textarea"
            rows={10}
            value={faqText}
            onChange={(e) => setFaqText(e.target.value)}
          />
          <p className="admin-field-hint">
            Format: [{`{ "question": "...", "answer": "..." }`}]
          </p>
        </div>

        <h2 className="admin-subtitle">CTA</h2>
        <div className="admin-form-group">
          <label htmlFor="primaryCtaLabel">Primary label</label>
          <input
            id="primaryCtaLabel"
            className="admin-input"
            value={form.primaryCtaLabel}
            onChange={(e) => updateField("primaryCtaLabel", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="primaryCtaHref">Primary href</label>
          <input
            id="primaryCtaHref"
            type="url"
            className="admin-input"
            value={form.primaryCtaHref}
            onChange={(e) => updateField("primaryCtaHref", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="secondaryCtaLabel">Secondary label</label>
          <input
            id="secondaryCtaLabel"
            className="admin-input"
            value={form.secondaryCtaLabel}
            onChange={(e) => updateField("secondaryCtaLabel", e.target.value)}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="secondaryCtaHref">Secondary href</label>
          <input
            id="secondaryCtaHref"
            type="url"
            className="admin-input"
            value={form.secondaryCtaHref}
            onChange={(e) => updateField("secondaryCtaHref", e.target.value)}
          />
        </div>

        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField("isPublished", e.target.checked)}
          />
          Published
        </label>
      </fieldset>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <button
        type="submit"
        className="admin-btn admin-btn--primary"
        disabled={readOnly || loading}
      >
        {loading ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
    </form>
  );
}
