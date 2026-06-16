"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NavMegaMenu } from "@/lib/navConfig";
import { useRouter } from "next/navigation";

type NavMegaMenuProps = {
  item: NavMegaMenu;
};

export default function NavMegaMenuPanel({ item }: NavMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="nav-mega"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          if (item.href) {
            router.push(item.href);
          } else {
            setOpen((v) => !v);
          }
        }}
      >
        {item.label}
        <ChevronDown
          size={14}
          className={`nav-dropdown-chevron${open ? " nav-dropdown-chevron--open" : ""}`}
        />
      </button>

      {open && (
        <div className="nav-mega-panel" role="menu">
          <div className="nav-mega-grid">
            {item.columns.map((col, colIndex) => (
              <div key={colIndex} className="nav-mega-col">
                {col.title && (
                  <p className="nav-mega-col-title">{col.title}</p>
                )}
                {col.links.length > 0 && (
                  <ul className="nav-mega-links">
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="nav-mega-link"
                          role="menuitem"
                          onClick={() => setOpen(false)}
                        >
                          <span className="nav-mega-link-label">
                            {link.label}
                          </span>
                          {link.description && (
                            <span className="nav-mega-link-desc">
                              {link.description}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {col.featured && (
                  <div className="nav-mega-featured">
                    <p className="nav-mega-featured-title">
                      {col.featured.title}
                    </p>
                    <p className="nav-mega-featured-text">
                      {col.featured.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
