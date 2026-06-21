"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  pending?: boolean;
  footer: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  size?: "default" | "wide" | "compact";
};

export default function AdminQuickCreateShell({
  open,
  title,
  subtitle,
  onClose,
  pending = false,
  footer,
  children,
  ariaLabel,
  size = "default",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onClose]);

  if (!open || !mounted) return null;

  function handleBackdropClick() {
    if (!pending) onClose();
  }

  return createPortal(
    <div
      className={`admin-quick-create-modal${
        size === "wide"
          ? " admin-quick-create-modal--wide"
          : size === "compact"
            ? " admin-quick-create-modal--compact"
            : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <div
        className="admin-quick-create-modal__backdrop"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div className="admin-quick-create-modal__panel">
        <header className="admin-quick-create-modal__header">
          <div className="admin-quick-create-modal__header-text">
            <h3 className="admin-quick-create-modal__title">{title}</h3>
            {subtitle && <p className="admin-quick-create-modal__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="admin-quick-create-modal__close"
            onClick={() => !pending && onClose()}
            disabled={pending}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>
        <div className="admin-quick-create-modal__body">{children}</div>
        <footer className="admin-quick-create-modal__footer">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}
