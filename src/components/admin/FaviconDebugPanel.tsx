"use client";

import { useEffect, useState } from "react";

type FaviconDebugData = {
  faviconUrl: string | null;
  brandingTable: boolean;
  metadataSource: string;
  fallbackUsed: boolean;
  generatedIconUrl: string;
  updatedAt: string | null;
  renderedIconLinks: string[];
  routes: {
    iconRoute: string;
    faviconIcoRoute: string;
    appleIconRoute: string;
  };
  hardcodedFiles: Record<string, boolean>;
  cmsApi: {
    settingsFaviconUrl: string | null;
    absoluteFaviconUrl: string | null;
  };
  error?: string;
};

export default function FaviconDebugPanel() {
  const [data, setData] = useState<FaviconDebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/debug/favicon");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Không thể tải diagnostics");
          setData(null);
          return;
        }
        setData(json);
      } catch {
        setError("Không thể kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return <p className="admin-loading">Đang tải diagnostics…</p>;
  }

  if (error) {
    return <p className="admin-message admin-message--error">{error}</p>;
  }

  if (!data) return null;

  const previewUrl = data.cmsApi.absoluteFaviconUrl ?? data.generatedIconUrl;

  return (
    <div className="admin-panel admin-favicon-debug">
      {!data.brandingTable && (
        <p className="admin-message admin-message--error" role="alert">
          BrandingSettings table chưa tồn tại. Chạy prisma migrate deploy.
        </p>
      )}

      <dl className="admin-health-list">
        <div className="admin-health-row">
          <dt>Branding favicon URL (DB)</dt>
          <dd>{data.faviconUrl ?? "— (null)"}</dd>
        </div>
        <div className="admin-health-row">
          <dt>Rendered metadata URL</dt>
          <dd>{data.generatedIconUrl}</dd>
        </div>
        <div className="admin-health-row">
          <dt>Metadata source</dt>
          <dd>{data.metadataSource}</dd>
        </div>
        <div className="admin-health-row">
          <dt>Fallback active?</dt>
          <dd>{data.fallbackUsed ? "Yes — using /icon default" : "No — CMS favicon"}</dd>
        </div>
        <div className="admin-health-row">
          <dt>Last updated</dt>
          <dd>
            {data.updatedAt
              ? new Date(data.updatedAt).toLocaleString("vi-VN")
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="admin-favicon-debug-preview">
        <p className="admin-subtitle">Preview</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Favicon preview" width={64} height={64} />
        <p className="admin-field-hint">{previewUrl}</p>
      </div>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Expected HTML link tags</h2>
        <ul className="admin-favicon-debug-links">
          {data.renderedIconLinks.map((line) => (
            <li key={line}>
              <code>{line}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-branding-section">
        <h2 className="admin-subtitle">Hardcoded favicon files audit</h2>
        <ul className="admin-favicon-debug-links">
          <li>public/favicon.ico — {data.hardcodedFiles.publicFaviconIco ? "exists" : "missing"}</li>
          <li>app/favicon.ico — {data.hardcodedFiles.appFaviconIco ? "exists" : "missing"}</li>
          <li>app/icon.tsx — {data.hardcodedFiles.appIconTsx ? "active (CMS proxy)" : "missing"}</li>
          <li>app/apple-icon.tsx — {data.hardcodedFiles.appAppleIconTsx ? "active (CMS proxy)" : "missing"}</li>
        </ul>
      </section>

      <p className="admin-field-hint">
        Browser cache: hard refresh (Cmd+Shift+R) or open incognito after CMS save.
        Favicon requests hit <code>/favicon.ico</code> → rewritten to <code>/icon</code>.
      </p>
    </div>
  );
}
