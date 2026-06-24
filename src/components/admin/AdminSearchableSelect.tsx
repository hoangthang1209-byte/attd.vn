"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type SearchableSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
  fallbackLabel?: string;
  fallbackSublabel?: string;
};

export default function AdminSearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— Chọn —",
  searchPlaceholder = "Tìm kiếm…",
  disabled = false,
  emptyMessage,
  className,
  fallbackLabel,
  fallbackSublabel,
}: Props) {
  const generatedId = useId();
  const controlId = id ?? `admin-combobox-${generatedId.replace(/:/g, "")}`;
  const listboxId = `${controlId}-listbox`;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 320,
    maxHeight: 320,
    placement: "bottom" as "bottom" | "top",
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.sublabel?.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term),
    );
  }, [options, search]);

  const selected =
    options.find((opt) => opt.value === value) ??
    (fallbackLabel
      ? {
          value,
          label: fallbackLabel,
          sublabel: fallbackSublabel,
        }
      : undefined);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 6;
    const desiredHeight = 320;
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const roomAbove = rect.top - viewportPadding - gap;
    const placement =
      roomBelow < Math.min(240, desiredHeight) && roomAbove > roomBelow
        ? "top"
        : "bottom";
    const availableHeight = placement === "bottom" ? roomBelow : roomAbove;
    const width = Math.min(
      Math.max(rect.width, 280),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );

    setPosition({
      left,
      top: placement === "bottom" ? rect.bottom + gap : rect.top - gap,
      width,
      maxHeight: Math.max(180, Math.min(desiredHeight, availableHeight)),
      placement,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        closeCombobox();
      }
    }

    function handleViewportChange() {
      updatePosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  const safeActiveIndex =
    activeIndex >= 0 && activeIndex < filtered.length
      ? activeIndex
      : filtered.length
        ? 0
        : -1;

  function closeCombobox({ restoreFocus = false } = {}) {
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function openCombobox() {
    const selectedIndex = options.findIndex((opt) => opt.value === value);
    setSearch("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.length ? 0 : -1);
    setOpen(true);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    closeCombobox({ restoreFocus: true });
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeCombobox({ restoreFocus: true });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        filtered.length ? Math.min(current + 1, filtered.length - 1) : -1,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && safeActiveIndex >= 0) {
      event.preventDefault();
      selectOption(filtered[safeActiveIndex].value);
    }
  }

  return (
    <div className={`admin-searchable-select${className ? ` ${className}` : ""}`}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className="admin-input admin-combobox__trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => {
          if (open) closeCombobox();
          else openCombobox();
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openCombobox();
          }
        }}
      >
        <span className={`admin-combobox__value${selected ? "" : " is-placeholder"}`}>
          <span className="admin-combobox__label">{selected?.label ?? placeholder}</span>
          {selected?.sublabel && (
            <span className="admin-combobox__sublabel">{selected.sublabel}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`admin-combobox__chevron${open ? " is-open" : ""}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className={`admin-combobox__popover admin-combobox__popover--${position.placement}`}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="admin-combobox__search-wrap">
            <Search size={15} aria-hidden />
            <input
              ref={searchRef}
              className="admin-combobox__search"
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={
                safeActiveIndex >= 0
                  ? `${listboxId}-option-${safeActiveIndex}`
                  : undefined
              }
            />
          </div>
          <div
            id={listboxId}
            className="admin-combobox__list"
            role="listbox"
            aria-label={placeholder}
          >
            {selected && (
              <button
                type="button"
                className="admin-combobox__option admin-combobox__option--clear"
                role="option"
                aria-selected={false}
                onClick={() => selectOption("")}
              >
                {placeholder}
              </button>
            )}
            {filtered.map((opt, index) => (
              <button
                id={`${listboxId}-option-${index}`}
                key={opt.value}
                type="button"
                className={`admin-combobox__option${
                  index === safeActiveIndex ? " is-active" : ""
                }`}
                role="option"
                aria-selected={opt.value === value}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(opt.value)}
              >
                <span className="admin-combobox__option-copy">
                  <span className="admin-combobox__option-label">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="admin-combobox__option-sublabel">{opt.sublabel}</span>
                  )}
                </span>
                {opt.value === value && <Check size={16} aria-hidden />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="admin-combobox__empty">
                {options.length === 0
                  ? emptyMessage ?? "Chưa có dữ liệu để chọn."
                  : "Không tìm thấy kết quả phù hợp."}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
