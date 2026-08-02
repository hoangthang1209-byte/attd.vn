"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { replaceBlock, type ContentBlock } from "@/features/blog/block-parser";
import {
  parseInlineMediaFigure,
  patchInlineMediaFigureHtml,
  type ParsedInlineFigure,
} from "@/features/content/inline-media/parse-inline-media-figure";
import type { InlineMediaBlockMeta } from "@/components/admin/blog-editor/BlogInlineMediaBlock";

export type PlanPlacement = {
  block: {
    id: string;
    mediaAssetId: string;
    locked: boolean;
    selectedBy: "SYSTEM" | "EDITOR";
    selectionReason: string | null;
    score: number | null;
    altText: string;
    caption: string | null;
    placement: { afterSectionId: string; position: string };
    variant: string;
  };
  section: { id: string; heading: string; intent?: string };
  candidate: {
    mediaAssetId: string;
    url: string;
    thumbnailUrl: string | null;
    title: string | null;
    altText: string | null;
    caption: string | null;
    source: string;
    bundleSlotType: string | null;
    visibility: string;
    width?: number | null;
    height?: number | null;
    roleCode?: string | null;
  };
  score: { total: number; signals: Array<{ key: string; points: number; detail: string }> };
};

export type PlanResponse = {
  targetCount: number;
  proposedCount: number;
  placements: PlanPlacement[];
  skippedSections: Array<{ sectionId: string; heading: string; reason: string }>;
  gaps: string[];
  warnings: string[];
  diagnostics: {
    candidateCount: number;
    bundleHitCount: number;
    discoveryHitCount: number;
  };
};

type BetterSignal = {
  sectionHeading: string;
  currentScore: number;
  betterScore: number;
  placement: PlanPlacement;
};

const IGNORE_KEY = "attd.blog.inlineMedia.ignored";

function readIgnored(postId: string | null): string[] {
  if (!postId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${IGNORE_KEY}.${postId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeIgnored(postId: string | null, ids: string[]) {
  if (!postId || typeof window === "undefined") return;
  window.localStorage.setItem(`${IGNORE_KEY}.${postId}`, JSON.stringify(ids));
}

type UseBlogInlineMediaOptions = {
  postId: string | null;
  value: string;
  onChange: (next: string) => void;
  blocks: ContentBlock[];
};

/**
 * Editor-side controller for Sprint 14.3 inline smart media.
 * Planning is explicit — never on every keystroke.
 */
export function useBlogInlineMedia({
  postId,
  value,
  onChange,
  blocks,
}: UseBlogInlineMediaOptions) {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [metaByBlockId, setMetaByBlockId] = useState<Record<string, InlineMediaBlockMeta>>({});
  const [pickerTarget, setPickerTarget] = useState<{
    mode: "replace" | "insert";
    blockId?: string;
    sectionHeading?: string;
    placement?: PlanPlacement;
  } | null>(null);
  const [betterSignals, setBetterSignals] = useState<BetterSignal[]>([]);
  const [dismissedBetter, setDismissedBetter] = useState<string[]>([]);

  useEffect(() => {
    setIgnored(readIgnored(postId));
  }, [postId]);

  const acceptedAssetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const block of blocks) {
      if (block.type !== "inline-media") continue;
      const parsed = parseInlineMediaFigure(block.raw);
      if (parsed) ids.add(parsed.mediaAssetId);
    }
    return ids;
  }, [blocks]);

  const suggestionsByHeading = useMemo(() => {
    const map = new Map<string, PlanPlacement>();
    if (!plan) return map;
    for (const placement of plan.placements) {
      if (ignored.includes(placement.block.mediaAssetId)) continue;
      if (acceptedAssetIds.has(placement.block.mediaAssetId)) continue;
      // Skip sections that already have an adjacent accepted figure in content.
      const heading = placement.section.heading;
      const headingBlockIndex = blocks.findIndex(
        (block) => block.type === "h2" && block.preview === heading,
      );
      if (headingBlockIndex >= 0) {
        const next = blocks[headingBlockIndex + 1];
        if (next?.type === "inline-media") continue;
      }
      map.set(heading, placement);
    }
    return map;
  }, [acceptedAssetIds, blocks, ignored, plan]);

  const runPlan = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!postId && !value.trim()) {
        setError("Cần lưu bài hoặc có nội dung trước khi gợi ý ảnh.");
        return null;
      }
      setBusy(true);
      setError(null);
      if (!opts?.quiet) setMessage(null);
      try {
        const response = await fetch("/api/content/media-placement/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            contentHtml: value,
            excludedMediaIds: ignored,
            rejectedMediaIds: ignored,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không lập được kế hoạch.");
        const next = data.plan as PlanResponse;
        setPlan(next);

        const nextMeta: Record<string, InlineMediaBlockMeta> = {};
        for (const placement of next.placements) {
          nextMeta[placement.block.id] = {
            locked: placement.block.locked,
            selectedBy: placement.block.selectedBy,
            selectionReason: placement.block.selectionReason,
            score: placement.block.score,
          };
        }
        setMetaByBlockId((current) => ({ ...current, ...nextMeta }));

        // Better-image signal for unlocked accepted figures.
        const signals: BetterSignal[] = [];
        for (const block of blocks) {
          if (block.type !== "inline-media") continue;
          const parsed = parseInlineMediaFigure(block.raw);
          if (!parsed?.blockId) continue;
          const meta = nextMeta[parsed.blockId] ?? metaByBlockId[parsed.blockId];
          if (meta?.locked) continue;
          const better = next.placements.find(
            (placement) =>
              placement.section.heading &&
              !ignored.includes(placement.block.mediaAssetId) &&
              placement.block.mediaAssetId !== parsed.mediaAssetId &&
              (placement.score.total ?? 0) >= (meta?.score ?? 0) + 12,
          );
          if (
            better &&
            !dismissedBetter.includes(`${parsed.blockId}:${better.block.mediaAssetId}`)
          ) {
            signals.push({
              sectionHeading: better.section.heading,
              currentScore: meta?.score ?? 0,
              betterScore: better.score.total,
              placement: better,
            });
          }
        }
        setBetterSignals(signals);

        if (!opts?.quiet) {
          setMessage(
            `Đề xuất ${next.proposedCount}/${next.targetCount} ảnh · Bundle ${next.diagnostics.bundleHitCount} · Discovery ${next.diagnostics.discoveryHitCount}`,
          );
        }
        return next;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi lập kế hoạch.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [blocks, dismissedBetter, ignored, metaByBlockId, postId, value],
  );

  const acceptPlacement = useCallback(
    async (placement: PlanPlacement) => {
      if (!postId) {
        setError("Lưu bài trước khi chèn ảnh.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/content/media-placement/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            confirm: true,
            rebuildUnlocked: false,
            placements: [placement],
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không chèn được ảnh.");
        if (typeof data.result?.content === "string") {
          onChange(data.result.content);
        }
        setMetaByBlockId((current) => ({
          ...current,
          [placement.block.id]: {
            locked: false,
            selectedBy: "SYSTEM",
            selectionReason: placement.block.selectionReason,
            score: placement.score.total,
          },
        }));
        setMessage("Đã chèn ảnh.");
        setPlan((current) =>
          current
            ? {
                ...current,
                placements: current.placements.filter((row) => row.block.id !== placement.block.id),
                proposedCount: Math.max(0, current.proposedCount - 1),
              }
            : current,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không chèn được ảnh.");
      } finally {
        setBusy(false);
      }
    },
    [onChange, postId],
  );

  const ignorePlacement = useCallback(
    (placement: PlanPlacement) => {
      setIgnored((current) => {
        const next = current.includes(placement.block.mediaAssetId)
          ? current
          : [...current, placement.block.mediaAssetId];
        writeIgnored(postId, next);
        return next;
      });
      setPlan((current) =>
        current
          ? {
              ...current,
              placements: current.placements.filter((row) => row.block.id !== placement.block.id),
            }
          : current,
      );
      if (postId) {
        void fetch("/api/content/media-placement/ignore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            mediaAssetId: placement.block.mediaAssetId,
            sectionId: placement.section.id,
          }),
        }).catch(() => {
          /* local ignore still applies */
        });
      }
    },
    [postId],
  );

  const updateFigureBlock = useCallback(
    (block: ContentBlock, patch: Parameters<typeof patchInlineMediaFigureHtml>[1]) => {
      const nextRaw = patchInlineMediaFigureHtml(block.raw, patch);
      onChange(replaceBlock(value, block, nextRaw));
    },
    [onChange, value],
  );

  const removeFigure = useCallback(
    async (block: ContentBlock) => {
      const parsed = parseInlineMediaFigure(block.raw);
      if (!parsed) return;
      if (metaByBlockId[parsed.blockId ?? ""]?.locked) {
        setError("Không thể xóa ảnh đã khóa.");
        return;
      }
      if (postId && parsed.blockId) {
        setBusy(true);
        try {
          const response = await fetch("/api/content/media-placement/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blogPostId: postId, blockId: parsed.blockId }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Không xóa được ảnh.");
          if (typeof data.content === "string") onChange(data.content);
          else onChange(replaceBlock(value, block, ""));
          setMessage("Đã xóa ảnh.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Không xóa được ảnh.");
        } finally {
          setBusy(false);
        }
        return;
      }
      onChange(replaceBlock(value, block, ""));
    },
    [metaByBlockId, onChange, postId, value],
  );

  const toggleLock = useCallback(
    async (block: ContentBlock) => {
      const parsed = parseInlineMediaFigure(block.raw);
      if (!parsed?.blockId || !postId) {
        setError("Cần lưu bài và có placement trước khi khóa.");
        return;
      }
      const current = metaByBlockId[parsed.blockId];
      const nextLocked = !current?.locked;
      setBusy(true);
      try {
        const response = await fetch("/api/content/media-placement/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            blockId: parsed.blockId,
            locked: nextLocked,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không khóa được ảnh.");
        setMetaByBlockId((map) => ({
          ...map,
          [parsed.blockId!]: {
            locked: nextLocked,
            selectedBy: data.block?.selectedBy ?? current?.selectedBy ?? "EDITOR",
            selectionReason: data.block?.selectionReason ?? current?.selectionReason ?? null,
            score: data.block?.score ?? current?.score ?? null,
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không khóa được ảnh.");
      } finally {
        setBusy(false);
      }
    },
    [metaByBlockId, postId],
  );

  const replaceFigure = useCallback(
    async (block: ContentBlock, mediaAssetId: string) => {
      const parsed = parseInlineMediaFigure(block.raw);
      if (!parsed?.blockId || !postId) {
        setError("Cần lưu bài trước khi thay ảnh.");
        return;
      }
      if (metaByBlockId[parsed.blockId]?.locked) {
        setError("Không thể thay ảnh đã khóa.");
        return;
      }
      setBusy(true);
      try {
        const response = await fetch("/api/content/media-placement/replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            blockId: parsed.blockId,
            mediaAssetId,
            selectedBy: "EDITOR",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thay được ảnh.");
        if (typeof data.content === "string") onChange(data.content);
        if (data.block) {
          setMetaByBlockId((map) => ({
            ...map,
            [parsed.blockId!]: {
              locked: Boolean(data.block.locked),
              selectedBy: data.block.selectedBy ?? "EDITOR",
              selectionReason: data.block.selectionReason ?? "Biên tập viên thay thế",
              score: data.block.score ?? null,
            },
          }));
        }
        setIgnored((current) => {
          const next = current.includes(parsed.mediaAssetId)
            ? current
            : [...current, parsed.mediaAssetId];
          writeIgnored(postId, next);
          return next;
        });
        setMessage("Đã thay ảnh.");
        setPickerTarget(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thay được ảnh.");
      } finally {
        setBusy(false);
      }
    },
    [metaByBlockId, onChange, postId],
  );

  const moveFigure = useCallback(
    async (block: ContentBlock, direction: "up" | "down") => {
      const index = blocks.findIndex((item) => item.id === block.id);
      if (index < 0) return;
      const swapWith = direction === "up" ? blocks[index - 1] : blocks[index + 1];
      if (!swapWith) return;
      // Prefer swapping with neighboring content chunks by rewriting the document.
      const a = block.raw;
      const b = swapWith.raw;
      let next = replaceBlock(value, block, "__TMP_INLINE_MEDIA__");
      const tmpBlocks = next.includes("__TMP_INLINE_MEDIA__") ? next : value;
      // Rebuild by slicing original string.
      const first = direction === "up" ? swapWith : block;
      const second = direction === "up" ? block : swapWith;
      if (first.start > second.start) return;
      const before = value.slice(0, first.start);
      const mid = value.slice(first.end, second.start);
      const after = value.slice(second.end);
      next = `${before}${second.raw}${mid}${first.raw}${after}`;
      onChange(next.replace(/\n{3,}/g, "\n\n"));

      const parsed = parseInlineMediaFigure(block.raw);
      if (postId && parsed?.blockId) {
        void fetch("/api/content/media-placement/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: postId,
            blockId: parsed.blockId,
            direction,
          }),
        }).catch(() => {
          /* content already moved locally */
        });
      }
      void a;
      void b;
      void tmpBlocks;
    },
    [blocks, onChange, postId, value],
  );

  const changeVariant = useCallback(
    (block: ContentBlock, variant: ParsedInlineFigure["variant"]) => {
      updateFigureBlock(block, { variant });
    },
    [updateFigureBlock],
  );

  const summary = useMemo(() => {
    let system = 0;
    let editor = 0;
    let locked = 0;
    for (const block of blocks) {
      if (block.type !== "inline-media") continue;
      const parsed = parseInlineMediaFigure(block.raw);
      const meta = parsed?.blockId ? metaByBlockId[parsed.blockId] : null;
      if (meta?.locked) locked += 1;
      if (meta?.selectedBy === "EDITOR") editor += 1;
      else system += 1;
    }
    const current = [...blocks].filter((block) => block.type === "inline-media").length;
    const missing = Math.max(0, (plan?.targetCount ?? 0) - current);
    return {
      current,
      target: plan?.targetCount ?? null,
      system,
      editor,
      locked,
      missing,
      suggestionCount: suggestionsByHeading.size,
    };
  }, [blocks, metaByBlockId, plan?.targetCount, suggestionsByHeading.size]);

  return {
    plan,
    busy,
    error,
    message,
    setMessage,
    setError,
    suggestionsByHeading,
    metaByBlockId,
    pickerTarget,
    setPickerTarget,
    betterSignals,
    dismissBetter: (key: string) => setDismissedBetter((current) => [...current, key]),
    runPlan,
    acceptPlacement,
    ignorePlacement,
    removeFigure,
    toggleLock,
    replaceFigure,
    moveFigure,
    changeVariant,
    updateFigureBlock,
    summary,
    ignored,
  };
}
