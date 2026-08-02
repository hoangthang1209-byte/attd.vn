"use client";

import { useMemo, useState } from "react";
import type { ContentBlock } from "@/features/blog/block-parser";
import { parseInlineMediaFigure } from "@/features/content/inline-media/parse-inline-media-figure";
import BlogInlineMediaBlock from "@/components/admin/blog-editor/BlogInlineMediaBlock";
import BlogInlineMediaSuggestion from "@/components/admin/blog-editor/BlogInlineMediaSuggestion";
import type { useBlogInlineMedia } from "@/components/admin/blog-editor/useBlogInlineMedia";

type MediaController = ReturnType<typeof useBlogInlineMedia>;

type BlogDocumentStreamProps = {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelect: (block: ContentBlock) => void;
  media: MediaController;
  focusMode?: boolean;
};

function sectionAllowsSuggest(block: ContentBlock, blocks: ContentBlock[], index: number): boolean {
  if (block.type !== "h2") return false;
  const heading = block.preview.toLowerCase();
  if (/câu hỏi thường gặp|faq|kết luận|liên hệ|yêu cầu tư vấn/.test(heading)) return false;
  const next = blocks[index + 1];
  if (next?.type === "inline-media") return false;
  // Very short following section body heuristic: next heading soon
  if (next && (next.type === "h2" || next.type === "h3")) return false;
  return true;
}

/**
 * Document stream: section → content preview → accepted/suggested image.
 * Primary inline media experience for Sprint 14.3.
 */
export default function BlogDocumentStream({
  blocks,
  selectedBlockId,
  onSelect,
  media,
  focusMode = false,
}: BlogDocumentStreamProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const h2HeadingsWithMedia = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < blocks.length; i += 1) {
      if (blocks[i].type === "h2" && blocks[i + 1]?.type === "inline-media") {
        set.add(blocks[i].preview);
      }
    }
    return set;
  }, [blocks]);

  return (
    <div className={`blog-document-stream ${focusMode ? "is-focus" : ""}`}>
      {(media.error || localError) && (
        <p className="blog-inline-media-local-error" role="alert">
          {media.error || localError}
        </p>
      )}

      {media.betterSignals.slice(0, 2).map((signal) => {
        const key = `${signal.placement.block.id}:${signal.placement.block.mediaAssetId}`;
        return (
          <div key={key} className="blog-inline-media-better" role="status">
            <strong>Có ảnh phù hợp hơn</strong>
            <span>
              {signal.sectionHeading}: {signal.currentScore} → {signal.betterScore}
            </span>
            <div className="blog-inline-media-better__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => void media.acceptPlacement(signal.placement)}
              >
                Xem / Thay ảnh
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => media.dismissBetter(key)}
              >
                Bỏ qua
              </button>
            </div>
          </div>
        );
      })}

      {blocks.map((block, index) => {
        const selected = block.id === selectedBlockId;

        if (block.type === "inline-media") {
          const figure = parseInlineMediaFigure(block.raw);
          if (!figure) {
            return (
              <button
                key={block.id}
                type="button"
                className={`blog-document-stream__chunk ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect(block)}
              >
                <span className="blog-document-stream__label">{block.label}</span>
                <span>{block.preview}</span>
              </button>
            );
          }
          const meta = figure.blockId ? media.metaByBlockId[figure.blockId] : null;
          return (
            <div key={block.id} id={`inline-media-${block.id}`} className="blog-document-stream__media">
              <BlogInlineMediaBlock
                figure={figure}
                meta={meta}
                compact={focusMode}
                onReplace={() =>
                  media.setPickerTarget({
                    mode: "replace",
                    blockId: block.id,
                    sectionHeading: blocks[index - 1]?.preview,
                  })
                }
                onToggleLock={() => void media.toggleLock(block)}
                onRemove={() => void media.removeFigure(block)}
                onMoveUp={() => void media.moveFigure(block, "up")}
                onMoveDown={() => void media.moveFigure(block, "down")}
                onVariantChange={(variant) => media.changeVariant(block, variant)}
                onCaptionChange={(caption) => media.updateFigureBlock(block, { caption })}
                onAltChange={(altText) => media.updateFigureBlock(block, { altText })}
              />
            </div>
          );
        }

        const suggestion =
          block.type === "h2" && !h2HeadingsWithMedia.has(block.preview)
            ? media.suggestionsByHeading.get(block.preview)
            : undefined;

        return (
          <div key={block.id} className="blog-document-stream__section">
            <button
              type="button"
              className={`blog-document-stream__chunk blog-document-stream__chunk--${block.type} ${
                selected ? "is-selected" : ""
              }`}
              onClick={() => onSelect(block)}
            >
              <span className="blog-document-stream__label">{block.label}</span>
              <span className="blog-document-stream__preview">{block.preview}</span>
            </button>

            {block.type === "h2" &&
              sectionAllowsSuggest(block, blocks, index) &&
              !suggestion &&
              !focusMode && (
                <button
                  type="button"
                  className="blog-document-stream__suggest"
                  disabled={media.busy}
                  onClick={() => {
                    setLocalError(null);
                    void media.runPlan();
                  }}
                >
                  + Gợi ý ảnh
                </button>
              )}

            {suggestion && (
              <BlogInlineMediaSuggestion
                heading={suggestion.section.heading}
                title={suggestion.candidate.title || suggestion.candidate.altText}
                thumbnailUrl={suggestion.candidate.thumbnailUrl || suggestion.candidate.url}
                score={suggestion.score.total}
                reason={suggestion.block.selectionReason}
                busy={media.busy}
                onAccept={() => void media.acceptPlacement(suggestion)}
                onReplace={() =>
                  media.setPickerTarget({
                    mode: "insert",
                    sectionHeading: suggestion.section.heading,
                    placement: suggestion,
                  })
                }
                onIgnore={() => media.ignorePlacement(suggestion)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
