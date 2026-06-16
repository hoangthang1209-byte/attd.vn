"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextPath = href.split("?")[0].split("#")[0];
      if (nextPath === pathname) return;

      setLoading(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="nav-progress" role="status" aria-live="polite" aria-label="Đang tải">
      <div className="nav-progress-bar" />
      <div className="nav-progress-spinner-wrap">
        <span className="nav-progress-spinner" />
        <span className="nav-progress-label">Đang tải…</span>
      </div>
    </div>
  );
}
