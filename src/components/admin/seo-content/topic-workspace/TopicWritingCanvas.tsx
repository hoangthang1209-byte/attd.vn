"use client";

import type { ReactNode } from "react";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";

type Props = { children: ReactNode };

/**
 * The primary writing surface. Comfortable reading width, centered in the
 * main column. Keeps `id="writing"` so scroll targets and existing contract
 * tests keep working.
 */
export default function TopicWritingCanvas({ children }: Props) {
  return (
    <section id="writing" className={styles.mainCol} aria-label="Writing canvas">
      <div className={styles.canvas}>{children}</div>
    </section>
  );
}
