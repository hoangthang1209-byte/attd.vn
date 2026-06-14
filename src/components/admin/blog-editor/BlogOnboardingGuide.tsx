"use client";

import { CTA_BLOCK_SNIPPET, FAQ_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";

export default function BlogOnboardingGuide() {
  return (
    <div className="admin-editor-onboarding">
      <p className="admin-editor-onboarding-title">Bắt đầu bài viết SEO</p>
      <p className="admin-field-hint">
        Dùng Quick Insert, SEO Templates hoặc chèn khối mẫu bên dưới.
      </p>

      <div className="admin-editor-onboarding-grid">
        <div className="admin-editor-onboarding-card">
          <p className="admin-editor-onboarding-label">Tiêu đề</p>
          <code># Nguồn hàng áo thun trơn giá sỉ</code>
        </div>
        <div className="admin-editor-onboarding-card">
          <p className="admin-editor-onboarding-label">Tiêu đề mục</p>
          <code>## Vì sao nên chọn nguồn hàng ổn định</code>
        </div>
        <div className="admin-editor-onboarding-card">
          <p className="admin-editor-onboarding-label">Ảnh</p>
          <code>![Mô tả ảnh](image-url)</code>
        </div>
        <div className="admin-editor-onboarding-card">
          <p className="admin-editor-onboarding-label">FAQ</p>
          <pre>{FAQ_BLOCK_SNIPPET}</pre>
        </div>
        <div className="admin-editor-onboarding-card">
          <p className="admin-editor-onboarding-label">CTA</p>
          <pre>{CTA_BLOCK_SNIPPET}</pre>
        </div>
      </div>
    </div>
  );
}
