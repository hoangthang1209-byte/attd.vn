"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SCROLL_CONTAINER_ID = "admin-content-scroll";
const STORAGE_PREFIX = "attd:admin-scroll:";

function routeScrollKey(pathname: string, search: string): string {
  return `${STORAGE_PREFIX}${pathname}${search}`;
}

function getScrollContainer(): HTMLElement | null {
  return document.getElementById(SCROLL_CONTAINER_ID);
}

/** Persists and restores scrollTop for the admin content panel per route. */
export default function AdminScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const routeKey = routeScrollKey(pathname, search ? `?${search}` : "");
  const prevRouteKeyRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const prevKey = prevRouteKeyRef.current;
    if (prevKey && prevKey !== routeKey) {
      sessionStorage.setItem(prevKey, String(container.scrollTop));
    }
    prevRouteKeyRef.current = routeKey;

    const saved = sessionStorage.getItem(routeKey);
    const targetTop = saved ? Number.parseInt(saved, 10) : 0;

    const restore = () => {
      container.scrollTop = Number.isFinite(targetTop) ? targetTop : 0;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(restore);
    });

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        sessionStorage.setItem(routeKey, String(container.scrollTop));
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      sessionStorage.setItem(routeKey, String(container.scrollTop));
    };
  }, [routeKey]);

  return null;
}
