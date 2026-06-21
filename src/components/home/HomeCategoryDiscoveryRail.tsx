"use client";

import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { HomepageCategoryItem } from "@/features/home/homepage.types";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  categories: HomepageCategoryItem[];
};

type RailRenderItem = {
  category: HomepageCategoryItem;
  key: string;
  isDuplicate: boolean;
};

const AUTO_SCROLL_MOBILE_PX_PER_SEC = 22;
const AUTO_SCROLL_DESKTOP_PX_PER_SEC = 28;
const DESKTOP_BREAKPOINT_PX = 768;
const WHEEL_SETTLE_MS = 100;
const DRAG_THRESHOLD_PX = 6;
const MIN_CATEGORIES_FOR_AUTO = 2;
const MIN_OVERFLOW_RATIO = 1.25;

function getDuplicateSegmentCount(categoryCount: number): number {
  if (categoryCount <= 1) return 0;
  if (categoryCount === 2) return 8;
  if (categoryCount === 3) return 5;
  return 2;
}

function buildRailItems(
  categories: HomepageCategoryItem[],
  duplicateSegmentCount: number,
): { items: RailRenderItem[]; primaryCount: number } {
  const count = categories.length;
  if (count === 0) return { items: [], primaryCount: 0 };

  const primary: RailRenderItem[] = categories.map((category) => ({
    category,
    key: category.id,
    isDuplicate: false,
  }));

  if (count === 1) return { items: primary, primaryCount: 1 };

  const duplicates: RailRenderItem[] = [];
  for (let segmentIndex = 1; segmentIndex <= duplicateSegmentCount; segmentIndex += 1) {
    for (const category of categories) {
      duplicates.push({
        category,
        key: `${category.id}-dup-${segmentIndex}`,
        isDuplicate: true,
      });
    }
  }

  return { items: [...primary, ...duplicates], primaryCount: count };
}

function measurePrimarySegmentWidth(track: HTMLElement, primaryCount: number): number {
  const style = getComputedStyle(track);
  const gap = Number.parseFloat(style.columnGap || style.gap) || 12;
  if (track.children.length < primaryCount) return 0;

  let width = 0;
  for (let i = 0; i < primaryCount; i += 1) {
    width += (track.children[i] as HTMLElement).offsetWidth;
    if (i < primaryCount - 1) width += gap;
  }
  return width;
}

function formatProductCountLabel(productCount: number | null | undefined): string | null {
  if (productCount == null || productCount < 1) return null;
  return `${productCount.toLocaleString("vi-VN")}+ lựa chọn`;
}

function devLog(message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (data) console.debug(`[HomeCategoryDiscoveryRail] ${message}`, data);
  else console.debug(`[HomeCategoryDiscoveryRail] ${message}`);
}

function CategoryRailCard({
  category,
  isDuplicate,
}: {
  category: HomepageCategoryItem;
  isDuplicate: boolean;
}) {
  const hasImage = category.imageUrl && isValidImageSrc(category.imageUrl);
  const countLabel = formatProductCountLabel(category.productCount);

  return (
    <Link
      href={category.href}
      className="home-category-rail__card"
      tabIndex={isDuplicate ? -1 : undefined}
      aria-hidden={isDuplicate ? true : undefined}
      draggable={false}
    >
      <div className="home-category-rail__media">
        {hasImage ? (
          <Image
            src={category.imageUrl!}
            alt={category.name}
            fill
            className="home-category-rail__img"
            sizes="(max-width: 767px) 255px, 220px"
            draggable={false}
          />
        ) : (
          <div className="home-category-rail__placeholder" aria-hidden>
            <Package size={32} strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div className="home-category-rail__body">
        <span className="home-category-rail__name">{category.name}</span>
        {countLabel ? <span className="home-category-rail__count">{countLabel}</span> : null}
      </div>
    </Link>
  );
}

export default function HomeCategoryDiscoveryRail({ categories }: Props) {
  const duplicateSegmentCount = getDuplicateSegmentCount(categories.length);
  const { items, primaryCount } = useMemo(
    () => buildRailItems(categories, duplicateSegmentCount),
    [categories, duplicateSegmentCount],
  );

  const layoutClass =
    categories.length === 1
      ? "home-category-rail--single"
      : categories.length <= 3
        ? "home-category-rail--few"
        : "";

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const segmentWidthRef = useRef(0);
  const trackWidthRef = useRef(0);
  const primaryCountRef = useRef(primaryCount);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runtimeCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingTransformRef = useRef(0);
  const hasLoggedStartRef = useRef(false);

  /** Sub-pixel transform position — never rounded for animation. */
  const transformXRef = useRef(0);

  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const transformAtDragStartRef = useRef(0);
  const dragMovedRef = useRef(false);
  const isPointerDraggingRef = useRef(false);
  const dragAxisCommittedRef = useRef(false);

  const engineRef = useRef({
    isInteracting: false,
    isHoverPaused: false,
    isReducedMotion: false,
    isDocumentVisible: true,
    hasHover: false,
    pointerHasMoved: false,
  });

  useEffect(() => {
    primaryCountRef.current = primaryCount;
  }, [primaryCount]);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const resumeImmediately = useCallback(() => {
    clearResumeTimer();
    engineRef.current.isInteracting = false;
    lastFrameRef.current = null;
  }, [clearResumeTimer]);

  const scheduleWheelSettleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      if (isPointerDraggingRef.current) return;
      engineRef.current.isInteracting = false;
      lastFrameRef.current = null;
    }, WHEEL_SETTLE_MS);
  }, [clearResumeTimer]);

  const wrapTransform = useCallback((allowNegativeWrap: boolean) => {
    const segmentWidth = segmentWidthRef.current;
    if (segmentWidth <= 0) return;
    let x = transformXRef.current;
    while (x >= segmentWidth) {
      x -= segmentWidth;
    }
    if (allowNegativeWrap) {
      while (x < 0) {
        x += segmentWidth;
      }
    }
    transformXRef.current = x;
  }, []);

  const applyTransform = useCallback((allowNegativeWrap = false) => {
    const track = trackRef.current;
    if (!track) return;
    wrapTransform(allowNegativeWrap);
    track.style.transform = `translate3d(${-transformXRef.current}px, 0, 0)`;
  }, [wrapTransform]);

  const remeasure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || primaryCountRef.current < MIN_CATEGORIES_FOR_AUTO) {
      segmentWidthRef.current = 0;
      trackWidthRef.current = 0;
      return;
    }
    segmentWidthRef.current = measurePrimarySegmentWidth(track, primaryCountRef.current);
    trackWidthRef.current = track.offsetWidth;
  }, []);

  const isEligible = (viewport: HTMLElement, track: HTMLElement) => {
    const engine = engineRef.current;
    const hasCategories = primaryCountRef.current >= MIN_CATEGORIES_FOR_AUTO;
    const canOverflow = track.offsetWidth > viewport.clientWidth + 1;
    const overflowRatio =
      viewport.clientWidth > 0 ? track.offsetWidth / viewport.clientWidth : 0;
    const minRatio =
      primaryCountRef.current === 2
        ? viewport.clientWidth >= DESKTOP_BREAKPOINT_PX
          ? 1.15
          : MIN_OVERFLOW_RATIO
        : 1;

    return (
      hasCategories &&
      canOverflow &&
      overflowRatio >= minRatio &&
      !engine.isInteracting &&
      !engine.isHoverPaused &&
      !engine.isReducedMotion &&
      engine.isDocumentVisible
    );
  };

  const getScrollSpeed = () =>
    window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`).matches
      ? AUTO_SCROLL_DESKTOP_PX_PER_SEC
      : AUTO_SCROLL_MOBILE_PX_PER_SEC;

  const ensureFocusedCardVisible = (target: EventTarget | null) => {
    const viewport = viewportRef.current;
    if (!viewport || !(target instanceof HTMLElement)) return;
    const card = target.closest(".home-category-rail__card") as HTMLElement | null;
    if (!card || card.getAttribute("aria-hidden") === "true") return;

    const viewportRect = viewport.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    if (cardRect.left < viewportRect.left) {
      transformXRef.current -= viewportRect.left - cardRect.left;
      applyTransform(true);
    } else if (cardRect.right > viewportRect.right) {
      transformXRef.current += cardRect.right - viewportRect.right;
      applyTransform(true);
    }
  };

  useLayoutEffect(() => {
    remeasure();
    applyTransform();
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      remeasure();
      applyTransform();
    });
    observer.observe(viewport);
    if (track) observer.observe(track);
    return () => observer.disconnect();
  }, [items, primaryCount, remeasure, applyTransform]);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");

    const maybeLogRuntimeStart = (viewport: HTMLElement, track: HTMLElement) => {
      if (process.env.NODE_ENV !== "development" || hasLoggedStartRef.current) return;
      if (!isEligible(viewport, track)) return;
      hasLoggedStartRef.current = true;
      startingTransformRef.current = transformXRef.current;
      devLog("transform engine started", {
        transformX: transformXRef.current,
        segmentWidth: segmentWidthRef.current,
        active: true,
      });

      if (runtimeCheckTimerRef.current) clearTimeout(runtimeCheckTimerRef.current);
      runtimeCheckTimerRef.current = setTimeout(() => {
        const delta = transformXRef.current - startingTransformRef.current;
        devLog("runtime check (2s)", {
          transformX: transformXRef.current,
          startingTransformX: startingTransformRef.current,
          delta,
          segmentWidth: segmentWidthRef.current,
          active: isEligible(viewport, track),
          clientWidth: viewport.clientWidth,
          trackWidth: track.offsetWidth,
        });
        if (isEligible(viewport, track) && delta < 3) {
          console.warn("[HomeCategoryDiscoveryRail] transform auto-scroll did not move");
        }
      }, 2000);
    };

    const syncMotion = () => {
      engineRef.current.isReducedMotion = motionMedia.matches;
    };

    const syncHover = () => {
      engineRef.current.hasHover = hoverMedia.matches;
    };

    syncMotion();
    syncHover();
    engineRef.current.isDocumentVisible = !document.hidden;

    motionMedia.addEventListener("change", syncMotion);
    hoverMedia.addEventListener("change", syncHover);

    const onVisibility = () => {
      engineRef.current.isDocumentVisible = !document.hidden;
      if (document.hidden) return;
      remeasure();
      if (!engineRef.current.isInteracting) {
        clearResumeTimer();
        lastFrameRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerMove = () => {
      engineRef.current.pointerHasMoved = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const tick = (timestamp: number) => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (viewport && track) {
        const eligible = isEligible(viewport, track);
        if (eligible) {
          maybeLogRuntimeStart(viewport, track);
          if (lastFrameRef.current == null) {
            lastFrameRef.current = timestamp;
          } else {
            const deltaMs = Math.min(timestamp - lastFrameRef.current, 48);
            lastFrameRef.current = timestamp;
            transformXRef.current += (getScrollSpeed() / 1000) * deltaMs;
            applyTransform(false);
          }
        } else {
          lastFrameRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const viewport = viewportRef.current;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      engineRef.current.isInteracting = true;
      clearResumeTimer();
      lastFrameRef.current = null;
      transformXRef.current += event.deltaX;
      applyTransform(true);
      scheduleWheelSettleResume();
    };
    viewport?.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      motionMedia.removeEventListener("change", syncMotion);
      hoverMedia.removeEventListener("change", syncHover);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      viewport?.removeEventListener("wheel", onWheel);
      clearResumeTimer();
      if (runtimeCheckTimerRef.current) clearTimeout(runtimeCheckTimerRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [primaryCount, items.length, applyTransform, remeasure, scheduleWheelSettleResume, clearResumeTimer]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function warnDocumentOverflow() {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth + 1) return;
      const viewport = viewportRef.current;
      console.debug("[HomeCategoryDiscoveryRail] document horizontal overflow detected", {
        documentClientWidth: doc.clientWidth,
        documentScrollWidth: doc.scrollWidth,
        railViewportClientWidth: viewport?.clientWidth ?? null,
        railTrackWidth: trackRef.current?.offsetWidth ?? null,
      });
    }

    warnDocumentOverflow();
    window.addEventListener("resize", warnDocumentOverflow);
    return () => window.removeEventListener("resize", warnDocumentOverflow);
  }, [items.length]);

  if (items.length === 0) return null;

  function pauseForUserInput() {
    engineRef.current.isInteracting = true;
    clearResumeTimer();
    lastFrameRef.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    isPointerDraggingRef.current = true;
    dragAxisCommittedRef.current = false;
    dragMovedRef.current = false;
    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
    transformAtDragStartRef.current = transformXRef.current;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isPointerDraggingRef.current) return;

    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;

    if (!dragAxisCommittedRef.current) {
      if (
        Math.abs(deltaX) < DRAG_THRESHOLD_PX &&
        Math.abs(deltaY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isPointerDraggingRef.current = false;
        return;
      }
      dragAxisCommittedRef.current = true;
      pauseForUserInput();
      viewportRef.current?.setPointerCapture(event.pointerId);
    }

    if (!dragAxisCommittedRef.current) return;

    if (Math.abs(deltaX) > DRAG_THRESHOLD_PX) dragMovedRef.current = true;
    transformXRef.current = transformAtDragStartRef.current - deltaX;
    applyTransform(true);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isPointerDraggingRef.current) return;
    const wasDragging = dragAxisCommittedRef.current;
    isPointerDraggingRef.current = false;
    dragAxisCommittedRef.current = false;
    if (wasDragging) {
      viewportRef.current?.releasePointerCapture(event.pointerId);
      wrapTransform(true);
      applyTransform(true);
    }
    resumeImmediately();
  }

  function handleFocusCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget) return;
    pauseForUserInput();
    ensureFocusedCardVisible(event.target);
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    resumeImmediately();
  }

  function handleClickCapture(event: React.MouseEvent) {
    if (dragMovedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      dragMovedRef.current = false;
    }
  }

  function handleMouseEnter() {
    if (!engineRef.current.hasHover || !engineRef.current.pointerHasMoved) return;
    engineRef.current.isHoverPaused = true;
    lastFrameRef.current = null;
  }

  function handleMouseLeave() {
    if (!engineRef.current.hasHover || !engineRef.current.isHoverPaused) return;
    engineRef.current.isHoverPaused = false;
    resumeImmediately();
  }

  return (
    <div
      className={`home-category-rail${layoutClass ? ` ${layoutClass}` : ""}`}
      aria-label="Khám phá danh mục nguồn hàng"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={viewportRef}
        className="home-category-rail__viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        onClickCapture={handleClickCapture}
      >
        <div ref={trackRef} className="home-category-rail__track">
          {items.map(({ category, key, isDuplicate }) => (
            <CategoryRailCard key={key} category={category} isDuplicate={isDuplicate} />
          ))}
        </div>
      </div>
    </div>
  );
}
