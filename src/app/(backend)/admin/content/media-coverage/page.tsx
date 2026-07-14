"use client";

import { useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import {
  MEDIA_BUNDLE_CONTENT_TYPES,
  MEDIA_BUNDLE_CONTENT_TYPE_LABELS,
  MEDIA_BUNDLE_SLOT_TYPE_LABELS,
} from "@/features/media/media-bundle-presets";
import type { MediaBundleContentType, MediaBundleSlotType } from "@prisma/client";

type PlanSampleAsset = {
  asset: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    title: string | null;
    altText: string | null;
  };
  score: number;
};

type PlanSlot = {
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  recommended: boolean;
  minAssets: number;
  foundCount: number;
  fillRatio: number;
  status: "MISSING" | "LOW" | "ENOUGH" | "STRONG";
  sampleAssets: PlanSampleAsset[];
};

type PlanResult = {
  contentType: MediaBundleContentType;
  slots: PlanSlot[];
  overallScore: number;
  overallStatus: "CRITICAL" | "INSUFFICIENT" | "BASIC" | "GOOD" | "STRONG";
  recommendations: string[];
};

const OVERALL_STATUS_LABELS: Record<PlanResult["overallStatus"], string> = {
  CRITICAL: "Nghiêm trọng",
  INSUFFICIENT: "Chưa đủ",
  BASIC: "Cơ bản",
  GOOD: "Tốt",
  STRONG: "Mạnh",
};

const SLOT_STATUS_LABELS: Record<PlanSlot["status"], string> = {
  MISSING: "Thiếu",
  LOW: "Còn thiếu",
  ENOUGH: "Đủ",
  STRONG: "Dư dùng",
};

function overallStatusStyle(status: PlanResult["overallStatus"]): React.CSSProperties {
  switch (status) {
    case "STRONG":
      return { background: "#dcfce7", color: "#166534" };
    case "GOOD":
      return { background: "#dbeafe", color: "#1e40af" };
    case "BASIC":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

function slotStatusStyle(status: PlanSlot["status"]): React.CSSProperties {
  switch (status) {
    case "STRONG":
      return { background: "#dcfce7", color: "#166534" };
    case "ENOUGH":
      return { background: "#dbeafe", color: "#1e40af" };
    case "LOW":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

export default function MediaCoveragePlannerPage() {
  const toast = useAdminToast();
  const [contentType, setContentType] = useState<MediaBundleContentType>("BLOG_ARTICLE");
  const [query, setQuery] = useState("");
  const [subjectTerms, setSubjectTerms] = useState("");
  const [industryTerms, setIndustryTerms] = useState("");
  const [useCaseTerms, setUseCaseTerms] = useState("");
  const [techniqueTerms, setTechniqueTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingBundle, setCreatingBundle] = useState(false);

  function splitTerms(value: string): string[] {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/media/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          query: query.trim() || undefined,
          subjectTerms: splitTerms(subjectTerms),
          industryTerms: splitTerms(industryTerms),
          useCaseTerms: splitTerms(useCaseTerms),
          techniqueTerms: splitTerms(techniqueTerms),
        }),
      });
      const data = (await res.json()) as { plan?: PlanResult; message?: string };
      if (!res.ok || !data.plan) throw new Error(data.message ?? "Không thể lập kế hoạch độ phủ ảnh");
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lập kế hoạch độ phủ ảnh");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  async function createBundleFromPlan() {
    setCreatingBundle(true);
    try {
      const res = await fetch("/api/content/media-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${MEDIA_BUNDLE_CONTENT_TYPE_LABELS[contentType]} — ${query.trim() || "Bộ media mới"}`,
          contentType,
          query: query.trim() || undefined,
          subjectTerms: splitTerms(subjectTerms),
          industryTerms: splitTerms(industryTerms),
          useCaseTerms: splitTerms(useCaseTerms),
          techniqueTerms: splitTerms(techniqueTerms),
          applyPreset: true,
        }),
      });
      const data = (await res.json()) as { bundle?: { id: string }; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể tạo bộ media");
      toast.success("Đã tạo bộ media từ kế hoạch");
      window.location.href = `/admin/content/media-bundles/${data.bundle.id}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo bộ media");
    } finally {
      setCreatingBundle(false);
    }
  }

  return (
    <>
      <AdminPageTitle title="Độ phủ hình ảnh cho nội dung" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>
            Kiểm tra xem thư viện ảnh hiện có đủ đáp ứng các vị trí quan trọng cho một loại nội dung
            trước khi bắt tay viết bài hoặc tạo trang mới.
          </p>
        </div>

        <form onSubmit={(e) => void handlePlan(e)} className="admin-form">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div className="admin-field" style={{ minWidth: 220 }}>
              <label className="admin-label">Loại nội dung</label>
              <select
                className="admin-input"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as MediaBundleContentType)}
              >
                {MEDIA_BUNDLE_CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field" style={{ minWidth: 220, flex: 1 }}>
              <label className="admin-label">Từ khóa nội dung</label>
              <input
                className="admin-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ví dụ: áo thun đồng phục xưởng may"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div className="admin-field" style={{ minWidth: 200, flex: 1 }}>
              <label className="admin-label">Chủ thể (phân tách bằng dấu phẩy)</label>
              <input
                className="admin-input"
                value={subjectTerms}
                onChange={(e) => setSubjectTerms(e.target.value)}
              />
            </div>
            <div className="admin-field" style={{ minWidth: 200, flex: 1 }}>
              <label className="admin-label">Ngành nghề</label>
              <input
                className="admin-input"
                value={industryTerms}
                onChange={(e) => setIndustryTerms(e.target.value)}
              />
            </div>
            <div className="admin-field" style={{ minWidth: 200, flex: 1 }}>
              <label className="admin-label">Mục đích sử dụng</label>
              <input
                className="admin-input"
                value={useCaseTerms}
                onChange={(e) => setUseCaseTerms(e.target.value)}
              />
            </div>
            <div className="admin-field" style={{ minWidth: 200, flex: 1 }}>
              <label className="admin-label">Kỹ thuật</label>
              <input
                className="admin-input"
                value={techniqueTerms}
                onChange={(e) => setTechniqueTerms(e.target.value)}
              />
            </div>
          </div>
          <AdminLoadingButton type="submit" pending={loading} variant="primary">
            Kiểm tra độ phủ ảnh
          </AdminLoadingButton>
        </form>

        {error && <p className="admin-message admin-message--error">{error}</p>}
        {loading && <InlineLoading title="Đang phân tích độ phủ ảnh…" tone="admin" />}

        {plan && !loading && (
          <div style={{ marginTop: 16 }}>
            <div className="admin-section-header">
              <h3 className="admin-subtitle" style={{ margin: 0 }}>
                Kết quả: {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[plan.contentType]}
              </h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="admin-badge" style={overallStatusStyle(plan.overallStatus)}>
                  {OVERALL_STATUS_LABELS[plan.overallStatus]} ({plan.overallScore}/100)
                </span>
                <AdminLoadingButton
                  pending={creatingBundle}
                  variant="primary"
                  onClick={() => void createBundleFromPlan()}
                >
                  Tạo Bundle từ kế hoạch này
                </AdminLoadingButton>
              </div>
            </div>

            {plan.recommendations.length > 0 && (
              <div className="admin-catalog-fieldset">
                <h4 className="admin-subtitle">Khuyến nghị</h4>
                <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
                  {plan.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {plan.slots.map((slot) => (
                <div key={slot.slotType} className="admin-catalog-fieldset">
                  <div className="admin-section-header" style={{ marginBottom: 4 }}>
                    <div>
                      <strong>{slot.label}</strong>{" "}
                      <span className="admin-badge">{MEDIA_BUNDLE_SLOT_TYPE_LABELS[slot.slotType]}</span>{" "}
                      {slot.required && <span className="admin-badge">Bắt buộc</span>}
                    </div>
                    <span className="admin-badge" style={slotStatusStyle(slot.status)}>
                      {SLOT_STATUS_LABELS[slot.status]} ({slot.foundCount}/{slot.minAssets})
                    </span>
                  </div>
                  {slot.sampleAssets.length === 0 ? (
                    <p className="admin-field-hint">Chưa tìm thấy ảnh phù hợp cho vị trí này.</p>
                  ) : (
                    <div
                      className="admin-media-grid"
                      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}
                    >
                      {slot.sampleAssets.map((item) => (
                        <div key={item.asset.id} className="admin-media-card">
                          <div className="admin-media-preview">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.asset.thumbnailUrl ?? item.asset.url}
                              alt={item.asset.altText ?? item.asset.title ?? ""}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
