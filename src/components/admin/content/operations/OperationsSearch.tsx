"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";

type OperationsSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Global search across title / keyword / slug — client-side only. */
export default function OperationsSearch({ value, onChange }: OperationsSearchProps) {
  return (
    <input
      type="search"
      className={`admin-input ${styles.searchInput}`}
      placeholder="Tìm theo tiêu đề, từ khóa, slug…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Tìm kiếm chủ đề nội dung"
    />
  );
}
