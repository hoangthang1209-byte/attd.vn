"use client";

import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  SEO_CONTENT_TYPE_LABELS,
  SEO_FUNNEL_STAGE_LABELS,
  SEO_SEARCH_INTENT_LABELS,
  SEO_TOPIC_PRIORITY_LABELS,
  SEO_TOPIC_STATUS_LABELS,
} from "@/features/content/seo/seo-labels";
import {
  SEO_CONTENT_TYPES,
  SEO_FUNNEL_STAGES,
  SEO_SEARCH_INTENTS,
  SEO_TOPIC_PRIORITIES,
  SEO_TOPIC_STATUSES,
} from "@/features/content/seo/seo-api-utils";
import { intentGuidanceText } from "@/features/content/seo/seo-intent-guidance";
import type { OverviewForm } from "@/components/admin/seo-content/SeoTopicDetailClient";
import type { SeoContentType, SeoFunnelStage, SeoSearchIntent, SeoTopicPriority, SeoTopicStatus } from "@prisma/client";

type Stats = {
  owner: string;
  priority: string;
  deadline: string;
  cluster: string;
  campaign: string;
  estimatedPublish: string;
  wordTarget: string;
  readingTime: string;
  heroStatus: string;
};

type Props = {
  defaultOpen?: boolean;
  overviewForm: OverviewForm;
  onOverviewFormChange: (next: OverviewForm) => void;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  stats: Stats;
};

/** "Chi tiết kế hoạch" — collapsed plan/overview details near the canvas, not a full-width card stack. */
export default function TopicProjectDetails({
  defaultOpen = false,
  overviewForm,
  onOverviewFormChange,
  onSubmit,
  saving,
  stats,
}: Props) {
  return (
    <details className={styles.canvasBlockSoft} open={defaultOpen}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Chi tiết kế hoạch</summary>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          margin: "12px 0",
        }}
      >
        <Stat label="Owner" value={stats.owner} />
        <Stat label="Priority" value={stats.priority} />
        <Stat label="Deadline" value={stats.deadline} />
        <Stat label="Cluster" value={stats.cluster} />
        <Stat label="Campaign" value={stats.campaign} />
        <Stat label="Estimated publish" value={stats.estimatedPublish} />
        <Stat label="Word target" value={stats.wordTarget} />
        <Stat label="Reading time" value={stats.readingTime} />
        <Stat label="Hero image" value={stats.heroStatus} />
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Chỉnh sửa tổng quan</summary>
        <p className="admin-field-hint">{intentGuidanceText(overviewForm.searchIntent)}</p>
        <form onSubmit={onSubmit} className="admin-form" style={{ marginTop: 12 }}>
          <div className="admin-field">
            <label className="admin-label">Tiêu đề</label>
            <input
              className="admin-input"
              value={overviewForm.title}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, title: e.target.value })}
              required
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input
              className="admin-input"
              value={overviewForm.slug}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, slug: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Từ khóa chính</label>
            <input
              className="admin-input"
              value={overviewForm.primaryKeyword}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, primaryKeyword: e.target.value })}
              required
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Search intent</label>
            <select
              className="admin-input"
              value={overviewForm.searchIntent}
              onChange={(e) =>
                onOverviewFormChange({ ...overviewForm, searchIntent: e.target.value as SeoSearchIntent })
              }
            >
              {SEO_SEARCH_INTENTS.map((intent) => (
                <option key={intent} value={intent}>
                  {SEO_SEARCH_INTENT_LABELS[intent]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại nội dung</label>
            <select
              className="admin-input"
              value={overviewForm.contentType}
              onChange={(e) =>
                onOverviewFormChange({ ...overviewForm, contentType: e.target.value as SeoContentType })
              }
            >
              {SEO_CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SEO_CONTENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Funnel</label>
            <select
              className="admin-input"
              value={overviewForm.funnelStage}
              onChange={(e) =>
                onOverviewFormChange({ ...overviewForm, funnelStage: e.target.value as SeoFunnelStage })
              }
            >
              {SEO_FUNNEL_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {SEO_FUNNEL_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Ưu tiên</label>
            <select
              className="admin-input"
              value={overviewForm.priority}
              onChange={(e) =>
                onOverviewFormChange({ ...overviewForm, priority: e.target.value as SeoTopicPriority })
              }
            >
              {SEO_TOPIC_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {SEO_TOPIC_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select
              className="admin-input"
              value={overviewForm.status}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, status: e.target.value as SeoTopicStatus })}
            >
              {SEO_TOPIC_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SEO_TOPIC_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Hạn hoàn thành</label>
            <input
              type="date"
              className="admin-input"
              value={overviewForm.dueDate}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, dueDate: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mô tả</label>
            <textarea
              className="admin-input"
              rows={2}
              value={overviewForm.description}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, description: e.target.value })}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú</label>
            <textarea
              className="admin-input"
              rows={2}
              value={overviewForm.notes}
              onChange={(e) => onOverviewFormChange({ ...overviewForm, notes: e.target.value })}
            />
          </div>
          <AdminLoadingButton type="submit" pending={saving} variant="primary">
            Lưu tổng quan
          </AdminLoadingButton>
        </form>
      </details>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        {label}
      </p>
      <p style={{ margin: 0 }}>{value}</p>
    </div>
  );
}
