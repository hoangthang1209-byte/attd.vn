"use client";

import { useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { DEFAULT_NAMED_VIEWS, deleteNamedView, listNamedViews, saveNamedView } from "@/features/content/operations/content-operations-views";
import type { OperationsFilters, OperationsInboxTab, OperationsNamedView } from "@/features/content/operations/content-operations.types";

const DEFAULT_VIEW_IDS = new Set(DEFAULT_NAMED_VIEWS.map((v) => v.id));

type OperationsNamedViewsProps = {
  currentInbox: OperationsInboxTab;
  currentFilters: OperationsFilters;
  currentGroup: string | null;
  onApply: (view: OperationsNamedView) => void;
};

/**
 * Toolbar chips over saved named views (inbox tab + facet filters + group).
 * Built-in defaults are always present; custom views persist to localStorage
 * only — no server round-trip, nothing governed is ever written here.
 */
export default function OperationsNamedViews({ currentInbox, currentFilters, currentGroup, onApply }: OperationsNamedViewsProps) {
  const [views, setViews] = useState<OperationsNamedView[]>([]);
  const [newViewName, setNewViewName] = useState("");

  useEffect(() => {
    setViews(listNamedViews());
  }, []);

  const saveCurrentView = () => {
    const name = newViewName.trim();
    if (!name) return;
    saveNamedView({ name, inbox: currentInbox, filters: currentFilters, group: currentGroup });
    setViews(listNamedViews());
    setNewViewName("");
  };

  const removeView = (id: string) => {
    deleteNamedView(id);
    setViews(listNamedViews());
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {views.map((view) => (
        <span key={view.id} className={styles.savedFilterChip}>
          <button
            type="button"
            onClick={() => onApply(view)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
          >
            {view.name}
          </button>
          {!DEFAULT_VIEW_IDS.has(view.id) ? (
            <button
              type="button"
              onClick={() => removeView(view.id)}
              aria-label={`Xóa view ${view.name}`}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#94a3b8" }}
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
      <input
        type="text"
        className="admin-input"
        style={{ maxWidth: 160 }}
        placeholder="Tên view mới"
        value={newViewName}
        onChange={(e) => setNewViewName(e.target.value)}
      />
      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={saveCurrentView}>
        Lưu view hiện tại
      </button>
    </div>
  );
}
