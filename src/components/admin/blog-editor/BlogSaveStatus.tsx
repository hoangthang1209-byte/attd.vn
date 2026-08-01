"use client";

import { useEffect, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

type BlogSaveStatusProps = {
  state: SaveState;
  dirty: boolean;
  updatedAt: string | null;
  errorText?: string | null;
};

function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "vừa xong";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(iso));
}

/**
 * Save feedback lives here permanently instead of in a toast: the writer can
 * always see whether the draft is safe without a notification interrupting.
 * Relative time is computed after mount so SSR and the client agree.
 */
export default function BlogSaveStatus({
  state,
  dirty,
  updatedAt,
  errorText,
}: BlogSaveStatusProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setNow(Date.now());
    });
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (state === "saving") {
    return (
      <span className="blog-save-status blog-save-status--busy" role="status" aria-live="polite">
        Saving…
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="blog-save-status blog-save-status--error" role="status" aria-live="polite">
        {errorText ?? "Lưu thất bại"}
      </span>
    );
  }

  if (state === "saved" && !dirty) {
    return (
      <span className="blog-save-status blog-save-status--ok" role="status" aria-live="polite">
        Saved
      </span>
    );
  }

  if (dirty) {
    return <span className="blog-save-status blog-save-status--dirty">Chưa lưu</span>;
  }

  if (updatedAt && now !== null) {
    return <span className="blog-save-status">Updated {relativeTime(updatedAt, now)}</span>;
  }

  return <span className="blog-save-status" />;
}
