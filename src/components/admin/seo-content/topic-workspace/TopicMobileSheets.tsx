"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";

type SheetKey = "outline" | "context";

type Props = {
  outline: ReactNode;
  context: ReactNode;
};

/** Bottom-sheet triggers that surface Outline / Context rail content on small screens. */
export default function TopicMobileSheets({ outline, context }: Props) {
  const [sheet, setSheet] = useState<SheetKey | null>(null);

  useEffect(() => {
    if (!sheet) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheet(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheet]);

  return (
    <>
      <div className={styles.mobileBar}>
        <button type="button" className={styles.toolbarButton} onClick={() => setSheet("outline")}>
          Dàn ý
        </button>
        <button type="button" className={styles.toolbarButton} onClick={() => setSheet("context")}>
          Ngữ cảnh
        </button>
      </div>
      {sheet && (
        <div className={styles.mobileSheetOverlay} onClick={() => setSheet(null)}>
          <div
            className={styles.mobileSheet}
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "outline" ? "Dàn ý" : "Ngữ cảnh"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileSheetHeader}>
              <p className={styles.mobileSheetTitle}>{sheet === "outline" ? "Dàn ý" : "Ngữ cảnh"}</p>
              <button
                type="button"
                className={styles.mobileSheetClose}
                aria-label="Đóng"
                onClick={() => setSheet(null)}
              >
                ×
              </button>
            </div>
            {sheet === "outline" ? outline : context}
          </div>
        </div>
      )}
    </>
  );
}
