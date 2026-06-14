"use client";

import { SEO_TEMPLATES } from "@/features/blog/seo-templates";

type BlogSeoTemplatePickerProps = {
  onSelect: (content: string) => void;
  disabled?: boolean;
};

export default function BlogSeoTemplatePicker({
  onSelect,
  disabled = false,
}: BlogSeoTemplatePickerProps) {
  return (
    <div className="admin-template-picker">
      <label className="admin-label" htmlFor="seo-template-select">
        SEO Templates
      </label>
      <select
        id="seo-template-select"
        className="admin-input"
        defaultValue=""
        disabled={disabled}
        onChange={(event) => {
          const template = SEO_TEMPLATES.find((item) => item.id === event.target.value);
          if (template) onSelect(template.content);
          event.target.value = "";
        }}
      >
        <option value="">Chọn template SEO...</option>
        {SEO_TEMPLATES.map((template) => (
          <option key={template.id} value={template.id}>
            {template.label}
          </option>
        ))}
      </select>
    </div>
  );
}
