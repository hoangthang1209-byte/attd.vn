"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import type { TopicPrimaryCta } from "@/features/content/editorial/editorial-ux";

export type DocumentHeaderOverflowItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

type Props = {
  title: string;
  primaryKeyword: string;
  statusLabel: string;
  statusTone: { bg: string; fg: string; border: string };
  progressPercent: number;
  campaignName: string;
  campaignHref: string;
  clusterName: string | null;
  wordTargetLabel: string;
  readingTimeLabel: string;
  publishTargetLabel: string;
  aiStatusLabel: string;
  primaryCta: TopicPrimaryCta;
  onPrimaryCtaClick: (cta: TopicPrimaryCta) => void;
  overflowItems: DocumentHeaderOverflowItem[];
};

/** Compact document header — one primary action, everything else in the overflow menu. */
export default function TopicDocumentHeader({
  title,
  primaryKeyword,
  statusLabel,
  statusTone,
  progressPercent,
  campaignName,
  campaignHref,
  clusterName,
  wordTargetLabel,
  readingTimeLabel,
  publishTargetLabel,
  aiStatusLabel,
  primaryCta,
  onPrimaryCtaClick,
  overflowItems,
}: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) setOverflowOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [overflowOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <div className={styles.headerTitleRow}>
          <h1 className={styles.headerTitle}>{title}</h1>
          <span
            className={styles.statusChip}
            style={{ background: statusTone.bg, color: statusTone.fg, border: `1px solid ${statusTone.border}` }}
          >
            {statusLabel}
          </span>
          <span className={styles.aiStatusChip} title="Sprint 16.2 giữ AI ở trạng thái tắt theo mặc định">
            {aiStatusLabel}
          </span>
        </div>
        <div className={styles.headerMetaRow}>
          <span>
            Từ khóa: <strong>{primaryKeyword || "—"}</strong>
          </span>
          <span aria-hidden>·</span>
          <Link href={campaignHref} className="admin-link">
            {campaignName || "Campaign"}
          </Link>
          {clusterName ? (
            <>
              <span aria-hidden>·</span>
              <span>{clusterName}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span>{wordTargetLabel}</span>
          {readingTimeLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{readingTimeLabel}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span>Xuất bản: {publishTargetLabel}</span>
        </div>
        <div className={styles.headerProgressRow}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%`, background: statusTone.fg }}
            />
          </div>
          <span className={styles.progressLabel}>Tiến độ {progressPercent}%</span>
        </div>
      </div>

      <div className={styles.headerActions}>
        {primaryCta.href && !primaryCta.staysOnPage ? (
          <Link href={primaryCta.href} className="admin-btn admin-btn--primary">
            {primaryCta.label}
          </Link>
        ) : (
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => onPrimaryCtaClick(primaryCta)}>
            {primaryCta.label}
          </button>
        )}
        {overflowItems.length > 0 && (
          <div className={styles.overflowWrap} ref={overflowRef}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen((v) => !v)}
            >
              ⋯
            </button>
            {overflowOpen && (
              <div className={styles.overflowMenu} role="menu">
                {overflowItems.map((item) =>
                  item.href ? (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={styles.overflowMenuItem}
                      role="menuitem"
                      onClick={() => setOverflowOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      className={styles.overflowMenuItem}
                      role="menuitem"
                      onClick={() => {
                        setOverflowOpen(false);
                        item.onClick?.();
                      }}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
