"use client";

import { useCallback, useState } from "react";

type PlanPlacement = {
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
  };
  score: { total: number; signals: Array<{ key: string; points: number; detail: string }> };
};

type PlanResponse = {
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

type BlogInlineMediaPanelProps = {
  postId: string | null;
  contentHtml: string;
  currentBodyImageCount: number;
  onContentApplied: (html: string) => void;
};

function selectedByLabel(block: PlanPlacement["block"]): string {
  if (block.locked) return "Đã khóa";
  if (block.selectedBy === "EDITOR") return "Biên tập viên chọn";
  return "Tự động chọn";
}

/**
 * Explicit inline media planner UI. Never auto-applies on mount.
 */
export default function BlogInlineMediaPanel({
  postId,
  contentHtml,
  currentBodyImageCount,
  onContentApplied,
}: BlogInlineMediaPanelProps) {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runPlan = useCallback(async () => {
    if (!postId && !contentHtml.trim()) {
      setError("Cần lưu bài hoặc có nội dung trước khi lập kế hoạch.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/content/media-placement/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogPostId: postId,
          contentHtml,
          excludedMediaIds: excluded,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không lập được kế hoạch.");
      const next = data.plan as PlanResponse;
      setPlan(next);
      setSelected(new Set(next.placements.map((item) => item.block.id)));
      setMessage(
        `Đề xuất ${next.proposedCount}/${next.targetCount} ảnh · Bundle ${next.diagnostics.bundleHitCount} · Discovery ${next.diagnostics.discoveryHitCount}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lập kế hoạch.");
    } finally {
      setBusy(false);
    }
  }, [postId, contentHtml, excluded]);

  const toggle = (blockId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const excludeOne = (mediaAssetId: string, blockId: string) => {
    setExcluded((current) => (current.includes(mediaAssetId) ? current : [...current, mediaAssetId]));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(blockId);
      return next;
    });
  };

  const applySelected = useCallback(async () => {
    if (!postId || !plan) {
      setError("Chỉ áp dụng được sau khi bài đã lưu và có kế hoạch.");
      return;
    }
    const placements = plan.placements.filter((item) => selected.has(item.block.id));
    if (!placements.length) {
      setError("Chọn ít nhất một ảnh để áp dụng.");
      return;
    }
    if (!window.confirm(`Áp dụng ${placements.length} ảnh vào bài viết?`)) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/content/media-placement/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogPostId: postId,
          confirm: true,
          rebuildUnlocked: true,
          placements,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không áp dụng được.");
      onContentApplied(data.result.content);
      setMessage(`Đã áp dụng ${data.result.applied} ảnh. Khóa sẵn ${data.result.skippedLocked}.`);
      setPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi áp dụng.");
    } finally {
      setBusy(false);
    }
  }, [postId, plan, selected, onContentApplied]);

  const lockOne = useCallback(
    async (blockId: string, locked: boolean) => {
      if (!postId) return;
      setBusy(true);
      try {
        const response = await fetch("/api/content/media-placement/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blogPostId: postId, blockId, locked }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không khóa được.");
        setPlan((current) => {
          if (!current) return current;
          return {
            ...current,
            placements: current.placements.map((item) =>
              item.block.id === blockId ? { ...item, block: { ...item.block, ...data.block } } : item,
            ),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi khóa.");
      } finally {
        setBusy(false);
      }
    },
    [postId],
  );

  const missing = Math.max(0, (plan?.targetCount ?? 0) - currentBodyImageCount);

  return (
    <div className="blog-inline-media-panel">
      <div className="blog-inline-media-panel__summary">
        <div>
          <strong>Ảnh trong nội dung</strong>
          <p className="admin-field-hint">
            Hiện có {currentBodyImageCount} ảnh thân bài
            {plan ? ` · đề xuất ${plan.proposedCount}/${plan.targetCount}` : ""}
            {missing > 0 && !plan ? ` · thiếu khoảng ${missing}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={busy}
          onClick={() => void runPlan()}
        >
          {busy ? "Đang tính…" : "Tự động chèn ảnh"}
        </button>
      </div>

      {error && <p className="admin-inline-error">{error}</p>}
      {message && <p className="admin-field-hint">{message}</p>}

      {plan && (
        <div className="blog-inline-media-plan">
          <p className="admin-field-hint">
            Xem trước trước khi áp dụng. Không ảnh nào được chèn cho đến khi bạn xác nhận.
          </p>

          <ul className="blog-inline-media-plan__list">
            {plan.placements.map((item) => {
              const checked = selected.has(item.block.id);
              const thumb = item.candidate.thumbnailUrl || item.candidate.url;
              return (
                <li key={item.block.id} className="blog-inline-media-plan__item">
                  <label className="blog-inline-media-plan__check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.block.id)}
                      disabled={item.block.locked}
                    />
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={item.block.altText} width={96} height={72} />
                    ) : (
                      <span className="blog-inline-media-plan__ph">No preview</span>
                    )}
                  </label>

                  <div className="blog-inline-media-plan__meta">
                    <p className="blog-inline-media-plan__section">{item.section.heading}</p>
                    <p className="blog-inline-media-plan__title">
                      {item.candidate.title || item.block.altText}
                    </p>
                    <p className="admin-field-hint">
                      <span className="blog-inline-media-badge">{selectedByLabel(item.block)}</span>
                      {" · "}score {item.score.total}
                      {item.candidate.bundleSlotType ? ` · slot ${item.candidate.bundleSlotType}` : ""}
                      {item.candidate.source ? ` · ${item.candidate.source}` : ""}
                    </p>
                    {item.block.selectionReason && (
                      <p className="admin-field-hint">Lý do: {item.block.selectionReason}</p>
                    )}
                    <div className="blog-inline-media-plan__actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={busy || item.block.locked}
                        onClick={() => excludeOne(item.block.mediaAssetId, item.block.id)}
                      >
                        Loại khỏi đề xuất
                      </button>
                      {postId && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={busy}
                          onClick={() => void lockOne(item.block.id, !item.block.locked)}
                        >
                          {item.block.locked ? "Mở khóa" : "Khóa"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {plan.gaps.length > 0 && (
            <details>
              <summary>Khoảng trống ({plan.gaps.length})</summary>
              <ul>
                {plan.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="blog-inline-media-plan__footer">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={busy}
              onClick={() => void runPlan()}
            >
              Tính lại
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={busy || !postId || selected.size === 0}
              onClick={() => void applySelected()}
            >
              Áp dụng đã chọn ({selected.size})
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={busy}
              onClick={() => setPlan(null)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
