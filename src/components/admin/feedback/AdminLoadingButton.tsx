"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  variant?: Variant;
  size?: "default" | "small" | "xs";
};

function variantClass(variant: Variant): string {
  switch (variant) {
    case "primary":
      return "admin-btn admin-btn--primary";
    case "danger":
      return "admin-btn admin-btn--danger";
    case "ghost":
      return "admin-btn admin-btn--ghost";
    default:
      return "admin-btn admin-btn--secondary";
  }
}

export default function AdminLoadingButton({
  children,
  pending = false,
  pendingLabel,
  variant = "secondary",
  size = "default",
  className,
  disabled,
  type = "button",
  ...props
}: Props) {
  const sizeClass =
    size === "small" ? " admin-btn--small" : size === "xs" ? " admin-btn--xs" : "";
  const isDisabled = disabled || pending;

  return (
    <button
      type={type}
      className={`${variantClass(variant)}${sizeClass}${className ? ` ${className}` : ""} admin-loading-button${pending ? " is-pending" : ""}`}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && (
        <Loader2 className="admin-loading-button__spinner" aria-hidden size={14} />
      )}
      <span className="admin-loading-button__label">
        {pending ? pendingLabel ?? "Đang xử lý…" : children}
      </span>
    </button>
  );
}
