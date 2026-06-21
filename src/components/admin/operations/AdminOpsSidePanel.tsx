"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AdminOpsSidePanel({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-ops-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="admin-ops-panel__backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="admin-ops-panel__sheet">
        <header className="admin-ops-panel__header">
          <h2 className="admin-ops-panel__title">{title}</h2>
          <button type="button" className="admin-ops-panel__close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </header>
        <div className="admin-ops-panel__body">{children}</div>
        {footer && <footer className="admin-ops-panel__footer">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
