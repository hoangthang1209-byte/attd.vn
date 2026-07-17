"use client";

import { useState } from "react";
import { confirmOverwriteExistingContent } from "@/features/products/product-content-suggestions";

type Props = {
  label?: string;
  existingValue: string;
  onApply: () => string | string[] | null | undefined;
  onFilled: (value: string | string[]) => void;
  /** Show “Gợi ý lại” when field already has content. */
  preferRetryLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

export default function ProductContentSuggestButton({
  label,
  existingValue,
  onApply,
  onFilled,
  preferRetryLabel = false,
  className,
  disabled,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const hasContent = Boolean(existingValue.trim());
  const buttonLabel =
    label ??
    (preferRetryLabel && hasContent ? "Gợi ý lại" : "Gợi ý");

  async function handleClick() {
    if (disabled || status === "loading") return;
    if (!confirmOverwriteExistingContent(existingValue)) return;

    setStatus("loading");
    try {
      // Keep a short async tick so staff see loading feedback even for sync generators.
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const next = onApply();
      if (next == null || (typeof next === "string" && !next.trim()) || (Array.isArray(next) && next.length === 0)) {
        setStatus("error");
        return;
      }
      onFilled(next);
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <span className={`admin-content-suggest${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--xs"
        onClick={() => void handleClick()}
        disabled={disabled || status === "loading"}
        data-testid="product-content-suggest-btn"
      >
        {status === "loading" ? "Đang gợi ý..." : buttonLabel}
      </button>
      {status === "success" && (
        <span className="admin-content-suggest__status admin-content-suggest__status--ok" role="status">
          Đã tạo gợi ý
        </span>
      )}
      {status === "error" && (
        <span className="admin-content-suggest__status admin-content-suggest__status--err" role="alert">
          Chưa thể tạo gợi ý. Vui lòng nhập thủ công.
        </span>
      )}
    </span>
  );
}
