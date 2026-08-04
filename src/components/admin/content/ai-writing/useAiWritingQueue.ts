"use client";

import { useCallback, useMemo, useState } from "react";

export type AiQueueItemStatus = "WAITING" | "RUNNING" | "COMPLETED" | "FAILED";

export type AiQueueItem = {
  id: string;
  sectionId: string;
  sectionHeading: string;
  actionLabel: string;
  status: AiQueueItemStatus;
  createdAt: number;
  message?: string;
};

/**
 * Simple client-side queue for multi-section generations. Deliberately not
 * backed by a server model — it's a UI convenience so an editor can fire
 * several section proposals and keep typing elsewhere while they resolve.
 * Each `AiGenerationRun` row remains the source of truth on the server.
 */
export function useAiWritingQueue() {
  const [items, setItems] = useState<AiQueueItem[]>([]);

  const upsert = useCallback((item: AiQueueItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === item.id);
      if (idx === -1) return [...prev, item];
      const next = [...prev];
      next[idx] = { ...next[idx], ...item };
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== "COMPLETED" && it.status !== "FAILED"));
  }, []);

  const counts = useMemo(
    () => ({
      running: items.filter((it) => it.status === "RUNNING").length,
      waiting: items.filter((it) => it.status === "WAITING").length,
      completed: items.filter((it) => it.status === "COMPLETED").length,
      failed: items.filter((it) => it.status === "FAILED").length,
    }),
    [items],
  );

  return { items, upsert, remove, clearCompleted, counts };
}
