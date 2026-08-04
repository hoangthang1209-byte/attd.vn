"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { QualityChip } from "@/features/content-generation/ux/section-quality";

function toneClass(tone: QualityChip["tone"]): string {
  if (tone === "ok") return styles.chipOk;
  if (tone === "warn") return styles.chipWarn;
  return styles.chipMissing;
}

/** Compact, read-only rendering of `computeSectionQualityChips` output. */
export default function SectionQualityChips({ chips }: { chips: QualityChip[] }) {
  return (
    <div className={styles.chipRow}>
      {chips.map((chip) => (
        <span key={chip.id} className={`${styles.chip} ${toneClass(chip.tone)}`} title={`${chip.label}: ${chip.score ?? "—"}`}>
          {chip.label} {chip.score != null ? chip.score : "—"}
        </span>
      ))}
    </div>
  );
}
