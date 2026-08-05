"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";

type OperationsSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Global search across title / keyword / slug for the kanban/calendar topic
 * list, and (client-side, via the same query string) across whatever
 * review/publish/refresh inbox items are currently loaded. Plain controlled
 * input — for very large inboxes callers may want to debounce `onChange`
 * before it lands in state; not needed at current inbox sizes.
 */
export default function OperationsSearch({ value, onChange }: OperationsSearchProps) {
  return (
    <input
      type="search"
      className={`admin-input ${styles.searchInput}`}
      placeholder="Tìm theo tiêu đề, từ khóa, slug…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Tìm kiếm chủ đề và hàng đợi vận hành"
    />
  );
}
