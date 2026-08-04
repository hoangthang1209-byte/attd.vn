"use client";

import Link from "next/link";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  SEO_INTERNAL_LINK_STATUS_LABELS,
  SEO_KEYWORD_TYPE_LABELS,
  SEO_METRIC_DATA_LABEL,
  SEO_TARGET_ENTITY_LABELS,
} from "@/features/content/seo/seo-labels";
import type {
  ExistingMatch,
  InternalLinkRow,
  KeywordRow,
  ScoresForm,
  TopicDetail,
} from "@/components/admin/seo-content/SeoTopicDetailClient";
import type { SeoInternalLinkStatus, SeoTargetEntityType } from "@prisma/client";

const TARGET_ENTITY_TYPES: SeoTargetEntityType[] = [
  "BLOG_POST",
  "LANDING_PAGE",
  "PRODUCT",
  "CATEGORY",
  "MANUFACTURING_ASSET",
  "DEALER_PAGE",
  "EXTERNAL",
  "NONE",
];

type LinkWithDirection = InternalLinkRow & { direction: "outgoing" | "incoming" };

type Props = {
  topic: TopicDetail;
  scoresForm: ScoresForm;
  onScoresFormChange: (next: ScoresForm) => void;
  onSubmitScores: (event: React.FormEvent) => void;
  scoresSaving: boolean;
  keywords: KeywordRow[];
  keywordPaste: string;
  onKeywordPasteChange: (value: string) => void;
  onBulkPasteKeywords: () => void;
  keywordSaving: boolean;
  matches: ExistingMatch[];
  matchLoading: boolean;
  onMatchExisting: () => void;
  onLinkTarget: (match?: ExistingMatch) => void;
  manualTargetUrl: string;
  onManualTargetUrlChange: (value: string) => void;
  manualEntityType: SeoTargetEntityType;
  onManualEntityTypeChange: (value: SeoTargetEntityType) => void;
  allLinks: LinkWithDirection[];
  linkSuggesting: boolean;
  onSuggestLinks: () => void;
  onUpdateLinkStatus: (linkId: string, status: SeoInternalLinkStatus) => void;
};

/** "Cài đặt nâng cao" — IDs, business scores, keywords, existing-content match and internal links. */
export default function TopicAdvancedDrawer({
  topic,
  scoresForm,
  onScoresFormChange,
  onSubmitScores,
  scoresSaving,
  keywords,
  keywordPaste,
  onKeywordPasteChange,
  onBulkPasteKeywords,
  keywordSaving,
  matches,
  matchLoading,
  onMatchExisting,
  onLinkTarget,
  manualTargetUrl,
  onManualTargetUrlChange,
  manualEntityType,
  onManualEntityTypeChange,
  allLinks,
  linkSuggesting,
  onSuggestLinks,
  onUpdateLinkStatus,
}: Props) {
  return (
    <details className="admin-sidebar-card">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Cài đặt nâng cao</summary>
      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 className="admin-sidebar-title">ID hệ thống</h4>
          <p className="admin-field-hint" style={{ fontFamily: "monospace" }}>
            Topic: {topic.id} · Strategy: {topic.strategyId}
            {topic.mediaBundleId ? ` · Media bundle: ${topic.mediaBundleId}` : ""}
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 className="admin-sidebar-title">Điểm kinh doanh</h4>
          <p className="admin-field-hint">{SEO_METRIC_DATA_LABEL.manual}</p>
          <form onSubmit={onSubmitScores} className="admin-form">
            {(
              [
                ["businessValue", "Giá trị kinh doanh"],
                ["relevanceScore", "Độ liên quan"],
                ["opportunityScore", "Cơ hội"],
                ["confidenceScore", "Độ tin cậy"],
              ] as const
            ).map(([key, label]) => (
              <div className="admin-field" key={key}>
                <label className="admin-label">
                  {label} ({scoresForm[key]})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={scoresForm[key]}
                  onChange={(e) => onScoresFormChange({ ...scoresForm, [key]: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="admin-input"
                  min={0}
                  max={100}
                  value={scoresForm[key]}
                  onChange={(e) => onScoresFormChange({ ...scoresForm, [key]: Number(e.target.value) })}
                />
              </div>
            ))}
            <AdminLoadingButton type="submit" pending={scoresSaving} variant="primary">
              Lưu điểm
            </AdminLoadingButton>
          </form>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 className="admin-sidebar-title">Từ khóa ({keywords.length})</h4>
          {keywords.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Từ khóa</th>
                    <th>Loại</th>
                    <th>Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id}>
                      <td>{kw.keyword}</td>
                      <td>{SEO_KEYWORD_TYPE_LABELS[kw.keywordType]}</td>
                      <td>{kw.source ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label">Dán hàng loạt (mỗi dòng một từ khóa)</label>
            <textarea
              className="admin-input"
              rows={4}
              value={keywordPaste}
              onChange={(e) => onKeywordPasteChange(e.target.value)}
              placeholder={"từ khóa 1\ntừ khóa 2"}
            />
          </div>
          <AdminLoadingButton type="button" pending={keywordSaving} variant="primary" onClick={onBulkPasteKeywords}>
            Thêm từ khóa
          </AdminLoadingButton>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 className="admin-sidebar-title">Nội dung hiện có</h4>
          <p className="admin-field-hint">
            URL đích: {topic.targetUrl ?? "Chưa có"} · {SEO_TARGET_ENTITY_LABELS[topic.targetEntityType]}
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <AdminLoadingButton type="button" pending={matchLoading} variant="secondary" onClick={onMatchExisting}>
              Tìm nội dung khớp
            </AdminLoadingButton>
          </div>
          {matches.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Loại</th>
                    <th>Điểm</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={`${m.entityType}-${m.entityId}`}>
                      <td>
                        {m.title}
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          {m.url}
                        </p>
                      </td>
                      <td>{SEO_TARGET_ENTITY_LABELS[m.entityType]}</td>
                      <td>{m.matchScore}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => onLinkTarget(m)}
                        >
                          Liên kết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label">Liên kết URL thủ công</label>
            <select
              className="admin-input"
              value={manualEntityType}
              onChange={(e) => onManualEntityTypeChange(e.target.value as SeoTargetEntityType)}
            >
              {TARGET_ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SEO_TARGET_ENTITY_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              className="admin-input"
              value={manualTargetUrl}
              onChange={(e) => onManualTargetUrlChange(e.target.value)}
              placeholder="/blog/slug-hoac-url"
            />
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => onLinkTarget()}>
              Lưu liên kết
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 className="admin-sidebar-title">Internal links ({allLinks.length})</h4>
          <AdminLoadingButton type="button" pending={linkSuggesting} variant="secondary" onClick={onSuggestLinks}>
            Gợi ý internal link
          </AdminLoadingButton>
          {allLinks.length > 0 && (
            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table admin-table--crm">
                <thead>
                  <tr>
                    <th>Hướng</th>
                    <th>Chủ đề</th>
                    <th>Anchor</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allLinks.map((link) => {
                    const related = link.direction === "outgoing" ? link.targetTopic : link.sourceTopic;
                    return (
                      <tr key={link.id}>
                        <td>{link.direction === "outgoing" ? "Đi ra" : "Đi vào"}</td>
                        <td>
                          {related ? (
                            <Link href={`/admin/content/topics/${related.id}`} className="admin-link">
                              {related.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{link.anchorText ?? "—"}</td>
                        <td>{SEO_INTERNAL_LINK_STATUS_LABELS[link.status]}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {link.status === "SUGGESTED" && (
                              <>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--xs admin-btn--secondary"
                                  onClick={() => onUpdateLinkStatus(link.id, "ACCEPTED")}
                                >
                                  Chấp nhận
                                </button>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--xs admin-btn--secondary"
                                  onClick={() => onUpdateLinkStatus(link.id, "REJECTED")}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            {link.status === "ACCEPTED" && (
                              <button
                                type="button"
                                className="admin-btn admin-btn--xs admin-btn--secondary"
                                onClick={() => onUpdateLinkStatus(link.id, "IMPLEMENTED")}
                              >
                                Đã triển khai
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="admin-field-hint">
          Cài đặt Writing Engine nâng cao (Context Build, loại nội dung, lịch sử Plan) nằm trong khối “Cài đặt tạo nội
          dung” bên trong canvas viết bài.
        </p>
      </div>
    </details>
  );
}
