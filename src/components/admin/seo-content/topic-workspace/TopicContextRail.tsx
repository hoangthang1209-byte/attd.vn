"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import TopicChecklistSummary from "@/components/admin/seo-content/topic-workspace/TopicChecklistSummary";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import AiEmptyState from "@/components/admin/content/ai-writing/AiEmptyState";
import ContentContextPanel from "@/components/admin/content/ContentContextPanel";
import type {
  ChecklistGroupSummary,
  EditorialActivityGroup,
  EditorialProgressSnapshot,
  TopicPrimaryCta,
} from "@/features/content/editorial/editorial-ux";

function RailModule({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <details
      className={styles.railModule}
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className={styles.railModuleSummary} aria-expanded={open}>
        <span>{title}</span>
        <span className={styles.railModuleCaret} aria-hidden="true">
          ›
        </span>
      </summary>
      <div className={styles.railModuleBody}>{open ? children : null}</div>
    </details>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.progressStat}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

type MediaInfo = {
  bundleName: string | null;
  planScore: number | null;
  planStatus: string | null;
  bundleId: string | null;
  checking: boolean;
  creating: boolean;
  onCheck: () => void;
  onCreate: () => void;
};

type Props = {
  topicId: string;
  primaryCta: TopicPrimaryCta;
  onPrimaryCtaClick: (cta: TopicPrimaryCta) => void;
  progress: EditorialProgressSnapshot;
  aiConfigured: boolean;
  media: MediaInfo;
  checklistGroups: ChecklistGroupSummary[];
  activity: EditorialActivityGroup[];
};

const dash = (value: string | number | null | undefined) => (value === null || value === undefined ? "—" : String(value));

/** Right rail — Next action, Progress, AI, Knowledge, Media, SEO/QA, Activity. */
export default function TopicContextRail({
  topicId,
  primaryCta,
  onPrimaryCtaClick,
  progress,
  aiConfigured,
  media,
  checklistGroups,
  activity,
}: Props) {
  const wordTarget =
    progress.wordTargetMin != null || progress.wordTargetMax != null
      ? `${dash(progress.wordTargetMin)}–${dash(progress.wordTargetMax)}`
      : "—";
  const sections =
    progress.sectionsTotal != null ? `${dash(progress.sectionsWithContent)}/${progress.sectionsTotal}` : "—";

  return (
    <aside className={styles.railCol} aria-label="Ngữ cảnh biên tập">
      <RailModule title="Hành động tiếp theo" defaultOpen>
        <p className={styles.railHint}>Một hành động chính cho trạng thái hiện tại.</p>
        {primaryCta.href && !primaryCta.staysOnPage ? (
          <Link href={primaryCta.href} className={styles.railCtaButton}>
            {primaryCta.label}
          </Link>
        ) : (
          <button type="button" className={styles.railCtaButton} onClick={() => onPrimaryCtaClick(primaryCta)}>
            {primaryCta.label}
          </button>
        )}
      </RailModule>

      <RailModule title="Tiến độ" defaultOpen>
        <ProgressStat label="Giai đoạn" value={progress.stageLabel} />
        <ProgressStat label="Số từ" value={progress.wordCount != null ? `${progress.wordCount} / ${wordTarget}` : `— / ${wordTarget}`} />
        <ProgressStat label="Sections có nội dung" value={sections} />
        <ProgressStat label="Internal links" value={String(progress.internalLinkCount)} />
        <ProgressStat label="CTA" value={progress.ctaReady ? "Sẵn sàng" : "Chưa có"} />
        <ProgressStat label="Media" value={progress.mediaReady ? "Sẵn sàng" : dash(progress.mediaGaps ? `${progress.mediaGaps} thiếu` : null)} />
        <ProgressStat label="QA" value={progress.qaBlockers != null ? `${progress.qaBlockers} lỗi · ${dash(progress.qaWarnings)} cảnh báo` : "—"} />
        <ProgressStat label="Kiểm duyệt" value={progress.reviewState ?? "—"} />
      </RailModule>

      <RailModule title="AI hỗ trợ viết">
        {aiConfigured ? (
          <p className={styles.railHint}>AI đã cấu hình — mở canvas viết bài để dùng trợ lý theo từng section.</p>
        ) : (
          <AiEmptyState reason="AI đang tắt theo mặc định. Bạn vẫn viết và chỉnh sửa bình thường trong canvas." />
        )}
      </RailModule>

      <RailModule title="Kiến thức (tham khảo)">
        <p className={styles.railHint}>Fact, quy tắc thương hiệu và nguồn tham khảo đã build cho chủ đề này.</p>
        <ContentContextPanel topicId={topicId} />
      </RailModule>

      <RailModule title="Media">
        <p className={styles.railHint}>
          Cover: {media.bundleName ?? "Chưa có"} · {media.planScore != null ? `điểm ${media.planScore}` : "—"} ·{" "}
          {media.planStatus ?? "Chưa kiểm tra"}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <AdminLoadingButton type="button" pending={media.checking} variant="secondary" size="small" onClick={media.onCheck}>
            Kiểm tra Cover / Gallery
          </AdminLoadingButton>
          <AdminLoadingButton type="button" pending={media.creating} variant="secondary" size="small" onClick={media.onCreate}>
            Tạo bộ hình
          </AdminLoadingButton>
        </div>
        {media.bundleId && (
          <Link href={`/admin/content/media-bundles/${media.bundleId}`} className="admin-link">
            Mở bộ hình
          </Link>
        )}
      </RailModule>

      <RailModule title="SEO / QA">
        <TopicChecklistSummary groups={checklistGroups} />
      </RailModule>

      <RailModule title={`Hoạt động (${activity.length})`}>
        {activity.length === 0 ? (
          <p className={styles.railHint}>Chưa có hoạt động.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "#475569" }}>
            {activity.map((item) => (
              <li key={item.key} style={{ marginBottom: 6 }}>
                {item.text}
                {item.count > 1 ? ` ×${item.count}` : ""}
              </li>
            ))}
          </ul>
        )}
      </RailModule>
    </aside>
  );
}
