"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

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
      <span className="admin-loading-button__label">
        {pending ? <ButtonLoading title={pendingLabel ?? "Đang lưu thông tin..."} tone="admin" /> : children}
      </span>
    </button>
  );
}
