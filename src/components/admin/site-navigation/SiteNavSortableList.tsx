"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import type { SiteNavLinkConfig } from "@/features/site-navigation/site-navigation.types";
import { normalizeSortOrders } from "@/features/site-navigation/site-navigation-validation";
import {
  SITE_NAV_ICON_OPTIONS,
  SITE_NAV_LINK_TARGET_LABELS,
} from "@/features/site-navigation/site-navigation-cms-defaults";

type Props = {
  items: SiteNavLinkConfig[];
  onChange: (items: SiteNavLinkConfig[]) => void;
  allowNested?: boolean;
};

function createBlankItem(base: SiteNavLinkConfig): SiteNavLinkConfig {
  return {
    ...base,
    id: `sn-new-${crypto.randomUUID()}`,
    label: "",
    href: "",
    description: null,
    iconKey: null,
    parentId: null,
    sortOrder: 999,
    isActive: true,
    showDesktop: true,
    showMobile: true,
    openInNewTab: false,
    trackEvent: null,
    linkTarget: "INTERNAL",
  };
}

export default function SiteNavSortableList({ items, onChange, allowNested = false }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateItem(index: number, patch: Partial<SiteNavLinkConfig>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(normalizeSortOrders(items.filter((_, i) => i !== index)));
  }

  function addItem() {
    const template = items[0] ?? {
      id: "sn-new",
      placement: "HEADER_MENU",
      parentId: null,
      label: "",
      href: "",
      description: null,
      iconKey: null,
      linkTarget: "INTERNAL" as const,
      sortOrder: 10,
      isActive: true,
      showDesktop: true,
      showMobile: true,
      openInNewTab: false,
      trackEvent: null,
    };
    onChange(normalizeSortOrders([...items, createBlankItem(template)]));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex == null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(normalizeSortOrders(next));
    setDragIndex(null);
  }

  return (
    <div className="site-nav-admin-list">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="admin-card site-nav-admin-item"
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(index)}
        >
          <div className="site-nav-admin-item__drag" aria-hidden="true">
            <GripVertical size={16} />
          </div>

          <div className="site-nav-admin-item__fields">
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Nhãn</label>
                <input
                  className="admin-input"
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>URL</label>
                <input
                  className="admin-input"
                  value={item.href}
                  onChange={(e) => updateItem(index, { href: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Loại liên kết</label>
                <select
                  className="admin-input"
                  value={item.linkTarget}
                  onChange={(e) =>
                    updateItem(index, {
                      linkTarget: e.target.value as SiteNavLinkConfig["linkTarget"],
                    })
                  }
                >
                  {Object.entries(SITE_NAV_LINK_TARGET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Biểu tượng</label>
                <select
                  className="admin-input"
                  value={item.iconKey ?? ""}
                  onChange={(e) => updateItem(index, { iconKey: e.target.value || null })}
                >
                  {SITE_NAV_ICON_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {allowNested ? (
              <div className="admin-form-group">
                <label>Mục cha (ID)</label>
                <input
                  className="admin-input"
                  value={item.parentId ?? ""}
                  onChange={(e) => updateItem(index, { parentId: e.target.value || null })}
                  placeholder="Để trống nếu là mục gốc"
                />
              </div>
            ) : null}

            <div className="site-nav-admin-item__toggles">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={item.isActive}
                  onChange={(e) => updateItem(index, { isActive: e.target.checked })}
                />
                Hiển thị
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={item.showDesktop}
                  onChange={(e) => updateItem(index, { showDesktop: e.target.checked })}
                />
                Desktop
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={item.showMobile}
                  onChange={(e) => updateItem(index, { showMobile: e.target.checked })}
                />
                Mobile
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={item.openInNewTab}
                  onChange={(e) => updateItem(index, { openInNewTab: e.target.checked })}
                />
                Tab mới
              </label>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn--ghost site-nav-admin-item__remove"
            onClick={() => removeItem(index)}
          >
            Xóa
          </button>
        </div>
      ))}

      <button type="button" className="admin-btn admin-btn--secondary" onClick={addItem}>
        Thêm mục
      </button>
    </div>
  );
}
