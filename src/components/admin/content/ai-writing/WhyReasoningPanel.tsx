"use client";

import { useState } from "react";
import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { ProposalWhyItem } from "@/features/content-generation/ux/proposal-display";

type Props = {
  items: ProposalWhyItem[];
  defaultOpen?: boolean;
};

/** "Why?" expandable list of reasons behind an AI proposal, each with a source chip. */
export default function WhyReasoningPanel({ items, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div>
      <button type="button" className={styles.whyToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "▾" : "▸"} Vì sao? ({items.length})
      </button>
      {open && (
        <ul className={styles.whyList}>
          {items.map((item, idx) => (
            <li key={idx}>
              {item.label}
              {item.sourceLabel && <span className={styles.whySource}>{item.sourceLabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
