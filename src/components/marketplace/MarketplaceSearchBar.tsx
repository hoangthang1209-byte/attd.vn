"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ChevronRight, Search } from "lucide-react";

const SEARCH_SUGGESTIONS = [
  { label: "Áo thun trơn", query: "áo thun trơn" },
  { label: "Áo polo trơn", query: "áo polo trơn" },
  { label: "Nón", query: "nón" },
  { label: "Tote bag", query: "tote bag" },
  { label: "Bình giữ nhiệt", query: "bình giữ nhiệt" },
  { label: "Quà tặng doanh nghiệp", query: "quà tặng doanh nghiệp" },
] as const;

const SEARCH_INTENT_SHORTCUTS = [
  { label: "Tìm nguồn hàng sỉ", href: "/nguon-hang" },
  { label: "Tư vấn đồng phục", href: "/lien-he" },
  { label: "Đăng ký đại lý", href: "/dai-ly" },
] as const;

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
  placeholder = "Tìm áo, nón, quà tặng...",
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
  const [panelOpen, setPanelOpen] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? localInputRef;
  const blurTimerRef = useRef<number | null>(null);
  const discoveryPanelId = useId();
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!autoFocus) return;
    const timer = window.setTimeout(() => {
      resolvedInputRef.current?.focus({ preventScroll: true });
      setPanelOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoFocus, resolvedInputRef]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = String(formData.get("q") ?? resolvedInputRef.current?.value ?? "").trim();
    resolvedInputRef.current?.blur();
    setPanelOpen(false);
    onSubmitNavigate?.();
    router.push(q ? `/san-pham?q=${encodeURIComponent(q)}` : "/san-pham");
  }

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setPanelOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }

  function handleFocus() {
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    setPanelOpen(true);
  }

  function handleBlur() {
    blurTimerRef.current = window.setTimeout(() => {
      setPanelOpen(false);
    }, 120);
  }

  function handleShortcutNavigate() {
    setPanelOpen(false);
    resolvedInputRef.current?.blur();
    onSubmitNavigate?.();
  }

  const isMobileHeader = variant === "mobile-header";
  const showDiscoveryPanel = panelOpen;

  return (
    <form
      className={[
        "mp-search",
        size === "large" ? "mp-search--large" : "",
        isMobileHeader ? "mp-search--mobile-header" : "",
        showDiscoveryPanel ? "mp-search--active" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="search"
      action="/san-pham"
      method="get"
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
        onChange={(e) => handleQueryChange(e.target.value)}
        onInput={(e) => handleQueryChange(e.currentTarget.value)}
        onKeyDown={handleInputKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="mp-search-input"
        aria-label="Tìm sản phẩm nguồn hàng"
        aria-expanded={showDiscoveryPanel}
        aria-controls={showDiscoveryPanel ? discoveryPanelId : undefined}
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

      <div id={discoveryPanelId} className="mp-search-discovery" role="region" aria-label="Gợi ý tìm kiếm">
        {trimmedQuery ? (
          <div className="mp-search-discovery__query">
            <p className="mp-search-discovery__eyebrow">Tìm nguồn hàng</p>
            <button type="submit" className="mp-search-discovery__submit">
              Tìm “{trimmedQuery}”
            </button>
            <p className="mp-search-discovery__hint">
              Nhấn Enter để xem sản phẩm, mã hàng hoặc nhóm danh mục phù hợp.
            </p>
          </div>
        ) : (
          <div className="mp-search-discovery__section">
            <p className="mp-search-discovery__eyebrow">Gợi ý phổ biến</p>
            <div className="mp-search-discovery__chips">
              {SEARCH_SUGGESTIONS.map((item) => (
                <Link
                  key={item.query}
                  href={`/san-pham?q=${encodeURIComponent(item.query)}`}
                  className="mp-search-discovery__chip"
                  onClick={handleShortcutNavigate}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mp-search-discovery__section mp-search-discovery__section--intents">
          <p className="mp-search-discovery__eyebrow">Nhu cầu B2B</p>
          <div className="mp-search-discovery__links">
            {SEARCH_INTENT_SHORTCUTS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="mp-search-discovery__link"
                onClick={handleShortcutNavigate}
              >
                <span>{item.label}</span>
                <ChevronRight size={14} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
