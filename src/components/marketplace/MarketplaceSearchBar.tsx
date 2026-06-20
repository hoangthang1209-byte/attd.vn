"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, type RefObject } from "react";
import { Search } from "lucide-react";

type MarketplaceSearchBarProps = {
  placeholder?: string;
  defaultValue?: string;
  size?: "default" | "large";
  variant?: "default" | "mobile-header";
  className?: string;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Called after a successful mobile/catalog search submit (before navigation). */
  onSubmitNavigate?: () => void;
};

export default function MarketplaceSearchBar({
  placeholder = "Tìm áo thun, polo, nón, tote, bình giữ nhiệt...",
  defaultValue = "",
  size = "default",
  variant = "default",
  className = "",
  autoFocus = false,
  inputRef,
  onSubmitNavigate,
}: MarketplaceSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const localInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? localInputRef;

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      resolvedInputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoFocus, resolvedInputRef]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    resolvedInputRef.current?.blur();
    onSubmitNavigate?.();
    router.push(q ? `/san-pham?q=${encodeURIComponent(q)}` : "/san-pham");
  }

  const isMobileHeader = variant === "mobile-header";

  return (
    <form
      className={[
        "mp-search",
        size === "large" ? "mp-search--large" : "",
        isMobileHeader ? "mp-search--mobile-header" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="search"
      onSubmit={handleSubmit}
    >
      {!isMobileHeader && (
        <Search size={size === "large" ? 20 : 18} className="mp-search-icon" aria-hidden />
      )}
      <input
        ref={resolvedInputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mp-search-input"
        aria-label="Tìm sản phẩm nguồn hàng"
        enterKeyHint="search"
      />
      <button
        type="submit"
        className="mp-search-btn"
        aria-label={isMobileHeader ? "Tìm kiếm" : undefined}
      >
        {isMobileHeader ? (
          <Search size={18} aria-hidden />
        ) : (
          <span className="mp-search-btn-text">Tìm kiếm</span>
        )}
      </button>
    </form>
  );
}
