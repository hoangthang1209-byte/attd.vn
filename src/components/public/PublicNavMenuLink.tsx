"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicNavLink } from "@/features/site-navigation/site-navigation.types";

type PublicNavMenuLinkProps = {
  link: PublicNavLink;
  variant: "header" | "mobile";
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
  onChildNavigate?: () => void;
};

export default function PublicNavMenuLink({
  link,
  variant,
  isActive,
  onNavigate,
  onChildNavigate,
}: PublicNavMenuLinkProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hasChildren = Boolean(link.children && link.children.length > 0);
  const parentActive =
    isActive(link.href) ||
    (link.children?.some((child) => isActive(child.href)) ?? false);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || variant !== "header") return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, variant]);

  if (!hasChildren) {
    if (variant === "mobile") {
      const active = isActive(link.href);
      return (
        <Link
          href={link.href}
          className={`mobile-nav-sublink mobile-nav-sublink--solo${active ? " mobile-nav-sublink--active" : ""}`}
          aria-current={active ? "page" : undefined}
          target={link.openInNewTab ? "_blank" : undefined}
          rel={link.openInNewTab ? "noopener noreferrer" : undefined}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      );
    }

    const active = isActive(link.href);
    return (
      <Link
        href={link.href}
        className={`mp-header-primary-nav-link${active ? " mp-header-primary-nav-link--active" : ""}`}
        aria-current={active ? "page" : undefined}
        target={link.openInNewTab ? "_blank" : undefined}
        rel={link.openInNewTab ? "noopener noreferrer" : undefined}
      >
        {link.label}
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <details className="mobile-nav-submenu">
        <summary
          className={`mobile-nav-sublink mobile-nav-sublink--parent${parentActive ? " mobile-nav-sublink--active" : ""}`}
        >
          {link.label}
        </summary>
        <div className="mobile-nav-submenu-children">
          <Link
            href={link.href}
            className={`mobile-nav-sublink mobile-nav-sublink--child${isActive(link.href) ? " mobile-nav-sublink--active" : ""}`}
            aria-current={isActive(link.href) ? "page" : undefined}
            target={link.openInNewTab ? "_blank" : undefined}
            rel={link.openInNewTab ? "noopener noreferrer" : undefined}
            onClick={onChildNavigate}
          >
            {link.label}
          </Link>
          {link.children!.map((child) => {
            const active = isActive(child.href);
            return (
              <Link
                key={child.id}
                href={child.href}
                className={`mobile-nav-sublink mobile-nav-sublink--child${active ? " mobile-nav-sublink--active" : ""}`}
                aria-current={active ? "page" : undefined}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                onClick={onChildNavigate}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      </details>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`mp-header-primary-nav-item${open ? " mp-header-primary-nav-item--open" : ""}`}
    >
      <button
        type="button"
        className={`mp-header-primary-nav-link mp-header-primary-nav-link--parent${parentActive ? " mp-header-primary-nav-link--active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        <span>{link.label}</span>
        <ChevronDown size={14} aria-hidden className="mp-header-primary-nav-chevron" />
      </button>
      {open ? (
        <div id={menuId} className="mp-header-primary-nav-submenu" role="menu">
          <Link
            href={link.href}
            role="menuitem"
            className={`mp-header-primary-nav-submenu-link${isActive(link.href) ? " mp-header-primary-nav-submenu-link--active" : ""}`}
            aria-current={isActive(link.href) ? "page" : undefined}
            target={link.openInNewTab ? "_blank" : undefined}
            rel={link.openInNewTab ? "noopener noreferrer" : undefined}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
          {link.children!.map((child) => {
            const active = isActive(child.href);
            return (
              <Link
                key={child.id}
                href={child.href}
                role="menuitem"
                className={`mp-header-primary-nav-submenu-link${active ? " mp-header-primary-nav-submenu-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                onClick={closeMenu}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
