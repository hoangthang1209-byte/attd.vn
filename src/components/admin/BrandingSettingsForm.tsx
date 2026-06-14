"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";

export type BrandingFormState = {
  companyTagline: string;
  facebookUrl: string;
  zaloUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
};

type Props = {
  initial: BrandingFormState & {
    headerLogoUrl: string | null;
    footerLogoUrl: string | null;
    faviconUrl: string | null;
    defaultOgImageUrl: string | null;
  };
  readOnly?: boolean;
};

function urlToPickerValue(url: string | null): MediaPickerValue | null {
  if (!url) return null;
  const filename = url.split("/").pop()?.split("?")[0] ?? "image";
  return { id: `existing-${filename}`, url, filename };
}

function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BrandingSettingsForm({ initial, readOnly = false }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<BrandingFormState>({
    companyTagline: initial.companyTagline,
    facebookUrl: initial.facebookUrl,
    zaloUrl: initial.zaloUrl,
    youtubeUrl: initial.youtubeUrl,
    tiktokUrl: initial.tiktokUrl,
    linkedinUrl: initial.linkedinUrl,
  });
  const [headerLogo, setHeaderLogo] = useState<MediaPickerValue | null>(
    urlToPickerValue(initial.headerLogoUrl)
  );
  const [footerLogo, setFooterLogo] = useState<MediaPickerValue | null>(
    urlToPickerValue(initial.footerLogoUrl)
  );
  const [favicon, setFavicon] = useState<MediaPickerValue | null>(
    urlToPickerValue(initial.faviconUrl)
  );
  const [ogImage, setOgImage] = useState<MediaPickerValue | null>(
    urlToPickerValue(initial.defaultOgImageUrl)
  );
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  function updateSocial(field: keyof BrandingFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setMessage(null);

    if (form.companyTagline.length > 160) {
      setMessage({ type: "error", text: "Tagline tối đa 160 ký tự" });
      return;
    }

    const socialFields: Array<[keyof BrandingFormState, string]> = [
      ["facebookUrl", "Facebook"],
      ["zaloUrl", "Zalo"],
      ["youtubeUrl", "Youtube"],
      ["tiktokUrl", "TikTok"],
      ["linkedinUrl", "LinkedIn"],
    ];

    for (const [key, label] of socialFields) {
      if (!isValidWebsite(form[key])) {
        setMessage({ type: "error", text: `${label} URL không hợp lệ` });
        return;
      }
    }

    setLoading(true);
    const res = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headerLogoUrl: headerLogo?.url ?? null,
        footerLogoUrl: footerLogo?.url ?? null,
        faviconUrl: favicon?.url ?? null,
        defaultOgImageUrl: ogImage?.url ?? null,
        ...form,
        facebookUrl: form.facebookUrl.trim() || null,
        zaloUrl: form.zaloUrl.trim() || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        tiktokUrl: form.tiktokUrl.trim() || null,
        linkedinUrl: form.linkedinUrl.trim() || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    setMessage({ type: "success", text: "✓ Đã lưu nhận diện thương hiệu" });
    router.refresh();
  }

  return (
    <form className="admin-form admin-branding-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="admin-branding-fieldset">
      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Logo Header</h2>
        <MediaPicker
          value={headerLogo}
          onChange={setHeaderLogo}
          folder="branding"
          label="Logo header"
        />
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Logo Footer</h2>
        <MediaPicker
          value={footerLogo}
          onChange={setFooterLogo}
          folder="branding"
          label="Logo footer"
        />
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Favicon</h2>
        <MediaPicker
          value={favicon}
          onChange={setFavicon}
          folder="branding"
          label="Favicon"
        />
        <p className="admin-field-hint">Khuyến nghị: 32×32 px, PNG hoặc ICO</p>
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Default Open Graph Image</h2>
        <div className="admin-branding-og-preview">
          <MediaPicker
            value={ogImage}
            onChange={setOgImage}
            folder="branding"
            label="OG image mặc định"
          />
        </div>
        <p className="admin-field-hint">Tỷ lệ khuyến nghị: 1200×630 px</p>
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Company Tagline</h2>
        <div className="admin-form-group">
          <label htmlFor="companyTagline">Tagline</label>
          <textarea
            id="companyTagline"
            className="admin-input admin-textarea"
            value={form.companyTagline}
            onChange={(e) => updateSocial("companyTagline", e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="KHO SỈ ĐỒNG PHỤC & QUÀ TẶNG DOANH NGHIỆP"
          />
          <p className="admin-field-hint">{form.companyTagline.length}/160 ký tự</p>
        </div>
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Social Links</h2>
        {(
          [
            ["facebookUrl", "Facebook"],
            ["zaloUrl", "Zalo"],
            ["youtubeUrl", "Youtube"],
            ["tiktokUrl", "TikTok"],
            ["linkedinUrl", "LinkedIn"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="admin-form-group">
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              type="url"
              className="admin-input"
              value={form[key]}
              onChange={(e) => updateSocial(key, e.target.value)}
              placeholder="https://"
            />
          </div>
        ))}
      </section>

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
      </fieldset>
    </form>
  );
}
