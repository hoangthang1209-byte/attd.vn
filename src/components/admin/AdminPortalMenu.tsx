"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  triggerLabel?: string;
  triggerClassName?: string;
  menuClassName?: string;
  /** Estimated menu height for flip calculation before measure. */
  estimatedHeight?: number;
  menuWidth?: number;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
};

/**
 * Compact overflow menu rendered via portal so table overflow cannot clip it.
 * Flips above the trigger when space below is insufficient; aligns end/right.
 */
export default function AdminPortalMenu({
  triggerLabel = "Thêm thao tác",
  triggerClassName = "admin-btn admin-btn--xs admin-btn--secondary",
  menuClassName = "admin-portal-menu",
  estimatedHeight = 220,
  menuWidth = 200,
  disabled,
  children,
}: Props) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" as "bottom" | "top" });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const measured = menuRef.current?.getBoundingClientRect().height;
    const height = measured && measured > 0 ? measured : estimatedHeight;
    const width = menuWidth;
    const viewportPad = 8;

    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const placement: "bottom" | "top" =
      spaceBelow < height && spaceAbove > spaceBelow ? "top" : "bottom";

    let top =
      placement === "bottom"
        ? rect.bottom + gap
        : Math.max(viewportPad, rect.top - height - gap);

    if (placement === "bottom" && top + height > window.innerHeight - viewportPad) {
      top = Math.max(viewportPad, window.innerHeight - height - viewportPad);
    }

    const preferredLeft = rect.right - width;
    const left = Math.max(
      viewportPad,
      Math.min(preferredLeft, window.innerWidth - width - viewportPad),
    );

    setPos({ top, left, placement });
  }, [estimatedHeight, menuWidth]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Remeasure after paint for accurate flip using real menu height.
    const raf = requestAnimationFrame(() => updatePosition());
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      close();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        ···
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className={`${menuClassName} admin-portal-menu--${pos.placement}`}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: menuWidth,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
