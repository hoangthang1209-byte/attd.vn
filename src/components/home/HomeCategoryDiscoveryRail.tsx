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
  segmentIndex: number;
};

const AUTO_SCROLL_CYCLE_MS = 42000;
const RESUME_IDLE_MS = 3500;
const DESKTOP_MIN_WIDTH = 768;
const DRAG_THRESHOLD_PX = 6;
const MIN_CATEGORIES_FOR_AUTO = 2;

function getDuplicateSegmentCount(categoryCount: number): number {
  if (categoryCount <= 1) return 0;
  if (categoryCount === 2) return 5;
  if (categoryCount === 3) return 3;
  return 2;
}

function buildRailItems(
  categories: HomepageCategoryItem[],
  duplicateSegmentCount: number,
): {
  items: RailRenderItem[];
  primaryCount: number;
} {
  const count = categories.length;
  if (count === 0) {
    return { items: [], primaryCount: 0 };
  }

  const primary = categories.map((category) => ({
    category,
    key: category.id,
    isDuplicate: false,
    segmentIndex: 0,
  }));

  if (count === 1) {
    return { items: primary, primaryCount: 1 };
  }

  const duplicateSegment = (segmentIndex: number): RailRenderItem[] =>
    categories.map((category) => ({
      category,
      key: `${category.id}-dup-${segmentIndex}`,
      isDuplicate: true,
      segmentIndex,
    }));

  const duplicates: RailRenderItem[] = [];
  for (let segmentIndex = 1; segmentIndex <= duplicateSegmentCount; segmentIndex += 1) {
    duplicates.push(...duplicateSegment(segmentIndex));
  }

  return {
    items: [...primary, ...duplicates],
    primaryCount: count,
  };
}

function measurePrimarySegmentWidth(track: HTMLElement, primaryCount: number): number {
  const style = getComputedStyle(track);
  const gap = Number.parseFloat(style.columnGap || style.gap) || 12;
  const children = track.children;
  if (children.length < primaryCount) return 0;

  let width = 0;
  for (let i = 0; i < primaryCount; i += 1) {
    width += (children[i] as HTMLElement).offsetWidth;
    if (i < primaryCount - 1) width += gap;
  }
  return width;
}

function isScrollable(track: HTMLElement): boolean {
  return track.scrollWidth > track.clientWidth + 1;
}

function devLog(message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (data) {
    console.debug(`[HomeCategoryDiscoveryRail] ${message}`, data);
  } else {
    console.debug(`[HomeCategoryDiscoveryRail] ${message}`);
  }
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
  const pausedRef = useRef(true);
  const pauseReasonRef = useRef("initial");
  const reducedMotionRef = useRef(false);
  const isDesktopRef = useRef(false);
  const isScrollableRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const primaryCountRef = useRef(primaryCount);

  useEffect(() => {
    primaryCountRef.current = primaryCount;
  }, [primaryCount]);

  const actionsRef = useRef({
    pause: (reason: string) => {
      void reason;
    },
    scheduleResume: (reason?: string) => {
      void reason;
    },
    remeasure: () => {},
    tryStartAutoScroll: () => {},
    canAutoScroll: (): boolean => false,
  });

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const pause = (reason: string) => {
    pausedRef.current = true;
    pauseReasonRef.current = reason;
    lastFrameRef.current = null;
    clearResumeTimer();
    devLog("paused", { reason });
  };

  const canAutoScroll = () =>
    primaryCountRef.current >= MIN_CATEGORIES_FOR_AUTO &&
    isDesktopRef.current &&
    !reducedMotionRef.current &&
    isScrollableRef.current &&
    segmentWidthRef.current > 0 &&
    !document.hidden;

  const tryStartAutoScroll = () => {
    if (canAutoScroll()) {
      pausedRef.current = false;
      pauseReasonRef.current = "running";
      lastFrameRef.current = null;
      devLog("auto-scroll started");
      return;
    }
    pausedRef.current = true;
    devLog("auto-scroll not eligible", {
      primaryCount: primaryCountRef.current,
      isDesktop: isDesktopRef.current,
      reducedMotion: reducedMotionRef.current,
      isScrollable: isScrollableRef.current,
      segmentWidth: segmentWidthRef.current,
      hidden: document.hidden,
    });
  };

  const scheduleResume = (reason = "idle") => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        tryStartAutoScroll();
        devLog("resume scheduled", { reason, running: !pausedRef.current });
      }
    }, RESUME_IDLE_MS);
  };

  const remeasure = () => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || primaryCountRef.current < MIN_CATEGORIES_FOR_AUTO) {
      segmentWidthRef.current = 0;
      isScrollableRef.current = false;
      return;
    }

    segmentWidthRef.current = measurePrimarySegmentWidth(track, primaryCountRef.current);
    isScrollableRef.current = isScrollable(viewport);

    devLog("measured", {
      categoryCount: primaryCountRef.current,
      viewportClientWidth: viewport.clientWidth,
      viewportScrollWidth: viewport.scrollWidth,
      segmentWidth: segmentWidthRef.current,
      isScrollable: isScrollableRef.current,
      reducedMotion: reducedMotionRef.current,
      isDesktop: isDesktopRef.current,
      eligible: canAutoScroll(),
      pauseReason: pauseReasonRef.current,
    });
  };

  useLayoutEffect(() => {
    actionsRef.current = {
      pause,
      scheduleResume,
      remeasure,
      tryStartAutoScroll,
      canAutoScroll,
    };
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    actionsRef.current.remeasure();

    const observer = new ResizeObserver(() => {
      actionsRef.current.remeasure();
      if (
        actionsRef.current.canAutoScroll() &&
        pausedRef.current &&
        pauseReasonRef.current !== "hover"
      ) {
        actionsRef.current.scheduleResume("resize");
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [items, primaryCount]);

  useEffect(() => {
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMedia = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

    const syncMotion = () => {
      reducedMotionRef.current = motionMedia.matches;
      if (motionMedia.matches) {
        actionsRef.current.pause("reduced-motion");
      } else {
        actionsRef.current.scheduleResume("reduced-motion-off");
      }
    };

    const syncDesktop = () => {
      isDesktopRef.current = desktopMedia.matches;
      if (!desktopMedia.matches) {
        actionsRef.current.pause("mobile");
      } else {
        actionsRef.current.remeasure();
        actionsRef.current.scheduleResume("desktop");
      }
    };

    syncMotion();
    syncDesktop();
    motionMedia.addEventListener("change", syncMotion);
    desktopMedia.addEventListener("change", syncDesktop);

    const onVisibility = () => {
      if (document.hidden) {
        actionsRef.current.pause("hidden");
      } else {
        actionsRef.current.remeasure();
        actionsRef.current.scheduleResume("visible");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    actionsRef.current.remeasure();
    if (actionsRef.current.canAutoScroll()) {
      actionsRef.current.tryStartAutoScroll();
    } else {
      actionsRef.current.pause(
        isScrollableRef.current ? "waiting" : "not-scrollable",
      );
      actionsRef.current.scheduleResume("mount");
    }

    const tick = (timestamp: number) => {
      const viewport = viewportRef.current;
      if (
        viewport &&
        !pausedRef.current &&
        actionsRef.current.canAutoScroll()
      ) {
        if (lastFrameRef.current == null) {
          lastFrameRef.current = timestamp;
        } else {
          const delta = timestamp - lastFrameRef.current;
          lastFrameRef.current = timestamp;
          const speed = segmentWidthRef.current / AUTO_SCROLL_CYCLE_MS;
          isProgrammaticScrollRef.current = true;
          viewport.scrollLeft += speed * delta;
          if (viewport.scrollLeft >= segmentWidthRef.current) {
            viewport.scrollLeft -= segmentWidthRef.current;
          }
          queueMicrotask(() => {
            isProgrammaticScrollRef.current = false;
          });
        }
      } else {
        lastFrameRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      motionMedia.removeEventListener("change", syncMotion);
      desktopMedia.removeEventListener("change", syncDesktop);
      document.removeEventListener("visibilitychange", onVisibility);
      clearResumeTimer();
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
        bodyScrollWidth: document.body.scrollWidth,
        railViewportClientWidth: viewport?.clientWidth ?? null,
        railViewportScrollWidth: viewport?.scrollWidth ?? null,
      });
    }

    warnDocumentOverflow();
    window.addEventListener("resize", warnDocumentOverflow);

    const viewport = viewportRef.current;
    const observer =
      viewport != null
        ? new ResizeObserver(() => {
            warnDocumentOverflow();
          })
        : null;
    if (viewport && observer) observer.observe(viewport);

    return () => {
      window.removeEventListener("resize", warnDocumentOverflow);
      observer?.disconnect();
    };
  }, [items.length]);

  if (items.length === 0) return null;

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = event.clientX;
    scrollStartRef.current = viewport.scrollLeft;
    viewport.setPointerCapture(event.pointerId);
    actionsRef.current.pause("pointerdown");
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = event.clientX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
    }
    viewport.scrollLeft = scrollStartRef.current - delta;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    viewportRef.current?.releasePointerCapture(event.pointerId);
    actionsRef.current.scheduleResume("pointerup");
  }

  function handleWheel() {
    actionsRef.current.pause("wheel");
    actionsRef.current.scheduleResume("wheel");
  }

  function handleScroll() {
    if (isProgrammaticScrollRef.current || isDraggingRef.current) return;
    actionsRef.current.pause("user-scroll");
    actionsRef.current.scheduleResume("user-scroll");
  }

  function handleFocusCapture() {
    actionsRef.current.pause("focus");
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    actionsRef.current.scheduleResume("blur");
  }

  function handleClickCapture(event: React.MouseEvent) {
    if (dragMovedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      dragMovedRef.current = false;
    }
  }

  return (
    <div
      className={`home-category-rail${layoutClass ? ` ${layoutClass}` : ""}`}
      aria-label="Khám phá danh mục nguồn hàng"
      onMouseEnter={() => actionsRef.current.pause("hover")}
      onMouseLeave={() => actionsRef.current.scheduleResume("hover-leave")}
    >
      <div
        ref={viewportRef}
        className="home-category-rail__viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={() => actionsRef.current.pause("touch")}
        onTouchEnd={() => actionsRef.current.scheduleResume("touchend")}
        onWheel={handleWheel}
        onScroll={handleScroll}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        onClickCapture={handleClickCapture}
      >
        <div ref={trackRef} className="home-category-rail__track">
          {items.map(({ category, key, isDuplicate }) => (
            <CategoryRailCard
              key={key}
              category={category}
              isDuplicate={isDuplicate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
