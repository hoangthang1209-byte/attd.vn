"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  className?: string;
};

export default function OrderAdvancedSection({
  title,
  children,
  defaultOpen = false,
  forceOpen = false,
  className,
}: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (defaultOpen && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [defaultOpen]);

  useEffect(() => {
    if (forceOpen && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [forceOpen]);

  return (
    <details
      ref={detailsRef}
      className={[styles.advancedSection, className].filter(Boolean).join(" ")}
    >
      <summary className={styles.advancedSection__summary}>{title}</summary>
      <div className={styles.advancedSection__body}>{children}</div>
    </details>
  );
}
