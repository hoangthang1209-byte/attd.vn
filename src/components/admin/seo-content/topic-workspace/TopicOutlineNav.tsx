"use client";

import { useMemo, useState } from "react";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import type { OutlineNavItem, SectionEditorialState } from "@/features/content/editorial/editorial-ux";

type Props = {
  items: OutlineNavItem[];
  sectionStates?: Record<string, SectionEditorialState>;
};

const STATE_DOT_CLASS: Record<SectionEditorialState, string> = {
  empty: styles.sectionStateEmpty,
  drafting: styles.sectionStateDrafting,
  needs_attention: styles.sectionStateNeedsAttention,
  qa_ok: styles.sectionStateQaOk,
  approved: styles.sectionStateApproved,
};

/** Collapsible outline navigator — indentation conveys H2/H3, no repeated level text. */
export default function TopicOutlineNav({ items, sectionStates }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.heading.toLowerCase().includes(q));
  }, [items, query]);

  function navigate(item: OutlineNavItem) {
    setActiveId(item.id);
    const target =
      document.querySelector(`[data-outline-id="${item.id}"]`) ?? document.getElementById("writing");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className={styles.outlineNav} aria-label="Dàn ý bài viết">
      <p className={styles.outlineNavTitle}>Dàn ý</p>
      {items.length > 4 && (
        <input
          className={styles.outlineSearch}
          type="search"
          placeholder="Tìm mục…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Tìm trong dàn ý"
        />
      )}
      {filtered.length === 0 ? (
        <p className={styles.outlineEmpty}>Chưa có outline.</p>
      ) : (
        <ul className={styles.outlineList}>
          {filtered.map((item) => {
            const state = sectionStates?.[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.outlineItem} ${item.depth > 0 ? styles.outlineItemDepth1 : ""} ${
                    activeId === item.id ? styles.outlineItemActive : ""
                  }`}
                  data-outline-id={item.id}
                  aria-current={activeId === item.id ? "true" : undefined}
                  onClick={() => navigate(item)}
                >
                  {state ? (
                    <span className={`${styles.sectionStateDot} ${STATE_DOT_CLASS[state]}`} aria-hidden />
                  ) : (
                    <span className={styles.outlineDot} aria-hidden />
                  )}
                  <span>{item.heading}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
