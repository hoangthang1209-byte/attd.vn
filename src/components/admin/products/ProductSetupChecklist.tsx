"use client";

import { useMemo, useState } from "react";
import {
  buildProductSetupChecklist,
  type ProductSetupChecklistInput,
  type SetupChecklistStatus,
} from "@/features/products/product-setup-checklist";

const STATUS_META: Record<SetupChecklistStatus, { icon: string; label: string; className: string }> = {
  done: { icon: "✓", label: "Đã xong", className: "admin-setup-checklist-item--done" },
  todo: { icon: "○", label: "Cần bổ sung", className: "admin-setup-checklist-item--todo" },
  optional: { icon: "•", label: "Không bắt buộc", className: "admin-setup-checklist-item--optional" },
};

type Props = {
  input: ProductSetupChecklistInput;
  title?: string;
};

function hasBasicRequiredFields(input: ProductSetupChecklistInput): boolean {
  return Boolean(input.name?.trim() && input.categoryId?.trim());
}

export default function ProductSetupChecklist({
  input,
  title = "Checklist thiết lập sản phẩm",
}: Props) {
  const groups = useMemo(() => buildProductSetupChecklist(input), [input]);
  const todoCount = useMemo(
    () => groups.reduce((total, group) => total + group.items.filter((item) => item.status === "todo").length, 0),
    [groups],
  );
  const doneCount = useMemo(
    () => groups.reduce((total, group) => total + group.items.filter((item) => item.status === "done").length, 0),
    [groups],
  );
  const [expanded, setExpanded] = useState(!hasBasicRequiredFields(input) || todoCount > 4);

  const readinessLabel =
    todoCount === 0 ? "Sẵn sàng cơ bản" : `Còn ${todoCount} mục quan trọng`;

  return (
    <section className="admin-setup-checklist admin-setup-checklist--compact" aria-label={title}>
      <div className="admin-setup-checklist__summary">
        <div className="admin-setup-checklist__summary-text">
          <p className="admin-setup-checklist__title">{title}</p>
          <p className="admin-setup-checklist__meta">
            <span className={todoCount === 0 ? "admin-setup-checklist__ready" : "admin-setup-checklist__pending"}>
              {readinessLabel}
            </span>
            <span className="admin-setup-checklist__counts">
              {doneCount} xong · {todoCount} cần bổ sung
            </span>
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          data-testid="product-setup-checklist-toggle"
        >
          {expanded ? "Thu gọn" : "Xem checklist"}
        </button>
      </div>

      {expanded && (
        <div className="admin-setup-checklist-groups" data-testid="product-setup-checklist-details">
          {groups.map((group) => (
            <div key={group.key} className="admin-setup-checklist-group">
              <p className="admin-setup-checklist-group__title">{group.title}</p>
              <ul className="admin-setup-checklist-group__items">
                {group.items.map((item) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <li key={item.key} className={meta.className}>
                      <span aria-hidden="true">{meta.icon}</span>
                      <span className="admin-setup-checklist-item__label">{item.label}</span>
                      <span className="admin-setup-checklist-item__status">{meta.label}</span>
                      {item.hint && (
                        <span className="admin-field-hint admin-field-hint--warning">{item.hint}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
