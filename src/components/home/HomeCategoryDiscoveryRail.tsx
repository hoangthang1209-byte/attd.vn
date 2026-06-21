"use client";

import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

const AUTO_SCROLL_MOBILE_PX_PER_SEC = 20;
const AUTO_SCROLL_DESKTOP_PX_PER_SEC = 28;
const DESKTOP_BREAKPOINT_PX = 768;
const RESUME_IDLE_MS = 4000;
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
            alt=""
            fill
            className="home-category-rail__img"
            sizes="(max-width: 767px) 38vw, 160px"
            draggable={false}
          />
        ) : (
          <div className="home-category-rail__placeholder" aria-hidden>
            <Package size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <span className="home-category-rail__name">{category.name}</span>
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
  const primaryCountRef = useRef(primaryCount);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const dragMovedRef = useRef(false);
  const runtimeCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingScrollLeftRef = useRef(0);
  const hasLoggedStartRef = useRef(false);
  const scrollRemainderRef = useRef(0);

  const engineRef = useRef({
    isInteracting: false,
    isHoverPaused: false,
    isReducedMotion: false,
    isDocumentVisible: true,
    resumeAt: 0,
    hasHover: false,
    pointerHasMoved: false,
  });

  useEffect(() => {
    primaryCountRef.current = primaryCount;
  }, [primaryCount]);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const scheduleResume = () => {
    clearResumeTimer();
    engineRef.current.resumeAt = Date.now() + RESUME_IDLE_MS;
    resumeTimerRef.current = setTimeout(() => {
      engineRef.current.resumeAt = 0;
    }, RESUME_IDLE_MS);
  };

  const remeasure = () => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || primaryCountRef.current < MIN_CATEGORIES_FOR_AUTO) {
      segmentWidthRef.current = 0;
      return;
    }
    segmentWidthRef.current = measurePrimarySegmentWidth(track, primaryCountRef.current);
  };

  const isEligible = (viewport: HTMLElement) => {
    const engine = engineRef.current;
    const hasCategories = primaryCountRef.current >= MIN_CATEGORIES_FOR_AUTO;
    const canOverflow = viewport.scrollWidth > viewport.clientWidth + 1;
    const overflowRatio =
      viewport.clientWidth > 0 ? viewport.scrollWidth / viewport.clientWidth : 0;
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
      engine.isDocumentVisible &&
      Date.now() >= engine.resumeAt
    );
  };

  const getScrollSpeed = () =>
    window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`).matches
      ? AUTO_SCROLL_DESKTOP_PX_PER_SEC
      : AUTO_SCROLL_MOBILE_PX_PER_SEC;

  useLayoutEffect(() => {
    remeasure();
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      remeasure();
    });
    observer.observe(viewport);
    if (track) observer.observe(track);
    return () => observer.disconnect();
  }, [items, primaryCount]);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");

    const maybeLogRuntimeStart = (viewport: HTMLElement) => {
      if (process.env.NODE_ENV !== "development" || hasLoggedStartRef.current) return;
      hasLoggedStartRef.current = true;
      startingScrollLeftRef.current = viewport.scrollLeft;
      devLog("started");

      if (runtimeCheckTimerRef.current) clearTimeout(runtimeCheckTimerRef.current);
      runtimeCheckTimerRef.current = setTimeout(() => {
        const currentScrollLeft = viewport.scrollLeft;
        const startingScrollLeft = startingScrollLeftRef.current;
        const delta = currentScrollLeft - startingScrollLeft;

        devLog("runtime check", {
          clientWidth: viewport.clientWidth,
          scrollWidth: viewport.scrollWidth,
          startingScrollLeft,
          currentScrollLeft,
          delta,
          isEligible: isEligible(viewport),
          categoryCount: primaryCountRef.current,
        });

        if (isEligible(viewport) && delta < 3) {
          console.warn("[HomeCategoryDiscoveryRail] auto-scroll did not move");
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
    engineRef.current.resumeAt = 0;

    motionMedia.addEventListener("change", syncMotion);
    hoverMedia.addEventListener("change", syncHover);

    const onVisibility = () => {
      engineRef.current.isDocumentVisible = !document.hidden;
      if (document.hidden) return;
      remeasure();
      if (!engineRef.current.isInteracting) {
        engineRef.current.resumeAt = 0;
        clearResumeTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerMove = () => {
      engineRef.current.pointerHasMoved = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const tick = (timestamp: number) => {
      const viewport = viewportRef.current;
      if (viewport) {
        const eligible = isEligible(viewport);
        if (eligible) {
          maybeLogRuntimeStart(viewport);
          if (lastFrameRef.current == null) {
            lastFrameRef.current = timestamp;
          } else {
            const deltaMs = timestamp - lastFrameRef.current;
            lastFrameRef.current = timestamp;
            const speed = getScrollSpeed();
            scrollRemainderRef.current += (speed / 1000) * deltaMs;
            let integerStep = 0;
            if (scrollRemainderRef.current >= 1) {
              integerStep = Math.floor(scrollRemainderRef.current);
              scrollRemainderRef.current -= integerStep;
            } else if (scrollRemainderRef.current <= -1) {
              integerStep = Math.ceil(scrollRemainderRef.current);
              scrollRemainderRef.current -= integerStep;
            }
            if (integerStep !== 0) {
              viewport.scrollLeft += integerStep;
            }
            const segmentWidth = segmentWidthRef.current;
            if (segmentWidth > 0 && viewport.scrollLeft >= segmentWidth) {
              viewport.scrollLeft -= segmentWidth;
            }
          }
        } else {
          lastFrameRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      motionMedia.removeEventListener("change", syncMotion);
      hoverMedia.removeEventListener("change", syncHover);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      clearResumeTimer();
      if (runtimeCheckTimerRef.current) clearTimeout(runtimeCheckTimerRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [primaryCount, items.length]);

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
        railViewportScrollWidth: viewport?.scrollWidth ?? null,
      });
    }

    warnDocumentOverflow();
    window.addEventListener("resize", warnDocumentOverflow);
    return () => window.removeEventListener("resize", warnDocumentOverflow);
  }, [items.length]);

  if (items.length === 0) return null;

  function beginInteraction() {
    engineRef.current.isInteracting = true;
    engineRef.current.resumeAt = Number.MAX_SAFE_INTEGER;
    clearResumeTimer();
    lastFrameRef.current = null;
    scrollRemainderRef.current = 0;
  }

  function endInteraction() {
    engineRef.current.isInteracting = false;
    scheduleResume();
    lastFrameRef.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    beginInteraction();
    dragMovedRef.current = false;
    dragStartXRef.current = event.clientX;
    scrollStartRef.current = viewport.scrollLeft;
    viewport.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!engineRef.current.isInteracting) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = event.clientX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) dragMovedRef.current = true;
    viewport.scrollLeft = scrollStartRef.current - delta;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!engineRef.current.isInteracting) return;
    viewportRef.current?.releasePointerCapture(event.pointerId);
    endInteraction();
  }

  function handleWheel() {
    beginInteraction();
    scheduleResume();
  }

  function handleFocusCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget) return;
    beginInteraction();
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    endInteraction();
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
    scheduleResume();
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
        onTouchStart={beginInteraction}
        onTouchEnd={endInteraction}
        onTouchCancel={endInteraction}
        onWheel={handleWheel}
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
