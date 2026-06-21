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

const MIN_CATEGORIES_FOR_LOOP = 4;
const AUTO_SCROLL_CYCLE_MS = 42000;
const RESUME_IDLE_MS = 4000;
const DESKTOP_MIN_WIDTH = 768;
const DRAG_THRESHOLD_PX = 6;

function buildRailItems(categories: HomepageCategoryItem[]): {
  items: RailRenderItem[];
  enableLoop: boolean;
  enableAutoScroll: boolean;
} {
  const count = categories.length;
  if (count === 0) {
    return { items: [], enableLoop: false, enableAutoScroll: false };
  }

  const primary = categories.map((category) => ({
    category,
    key: category.id,
    isDuplicate: false,
  }));

  if (count === 1) {
    return { items: primary, enableLoop: false, enableAutoScroll: false };
  }

  if (count >= MIN_CATEGORIES_FOR_LOOP) {
    const duplicate = categories.map((category) => ({
      category,
      key: `${category.id}-loop`,
      isDuplicate: true,
    }));
    return {
      items: [...primary, ...duplicate],
      enableLoop: true,
      enableAutoScroll: true,
    };
  }

  return { items: primary, enableLoop: false, enableAutoScroll: false };
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
            sizes="(max-width: 767px) 42vw, 160px"
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
  const railConfig = useMemo(() => buildRailItems(categories), [categories]);
  const { items, enableLoop, enableAutoScroll } = railConfig;

  const layoutClass =
    categories.length === 1
      ? "home-category-rail--single"
      : categories.length <= 3
        ? "home-category-rail--few"
        : "";

  const trackRef = useRef<HTMLDivElement>(null);
  const loopWidthRef = useRef(0);
  const pausedRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const isDesktopRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const enableLoopRef = useRef(enableLoop);
  const enableAutoScrollRef = useRef(enableAutoScroll);

  useEffect(() => {
    enableLoopRef.current = enableLoop;
    enableAutoScrollRef.current = enableAutoScroll;
  }, [enableLoop, enableAutoScroll]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !enableLoopRef.current) {
      loopWidthRef.current = 0;
      return;
    }

    const measure = () => {
      loopWidthRef.current = track.scrollWidth / 2;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMedia = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    const pause = () => {
      pausedRef.current = true;
      lastFrameRef.current = null;
      clearResumeTimer();
    };

    const scheduleResume = () => {
      clearResumeTimer();
      resumeTimerRef.current = setTimeout(() => {
        if (
          !reducedMotionRef.current &&
          enableAutoScrollRef.current &&
          isDesktopRef.current &&
          !isDraggingRef.current
        ) {
          pausedRef.current = false;
          lastFrameRef.current = null;
        }
      }, RESUME_IDLE_MS);
    };

    const syncMotion = () => {
      reducedMotionRef.current = media.matches;
      if (media.matches) pause();
    };

    const syncDesktop = () => {
      isDesktopRef.current = desktopMedia.matches;
      if (!desktopMedia.matches) pause();
      else if (!reducedMotionRef.current && enableAutoScrollRef.current) {
        scheduleResume();
      }
    };

    syncMotion();
    syncDesktop();
    media.addEventListener("change", syncMotion);
    desktopMedia.addEventListener("change", syncDesktop);

    const onVisibility = () => {
      if (document.hidden) pause();
      else scheduleResume();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (enableAutoScrollRef.current && !media.matches && desktopMedia.matches) {
      scheduleResume();
    }

    return () => {
      media.removeEventListener("change", syncMotion);
      desktopMedia.removeEventListener("change", syncDesktop);
      document.removeEventListener("visibilitychange", onVisibility);
      clearResumeTimer();
    };
  }, [categories.length, enableAutoScroll]);

  useEffect(() => {
    if (!enableAutoScroll) return;

    const tick = (timestamp: number) => {
      const track = trackRef.current;
      if (
        track &&
        !pausedRef.current &&
        !reducedMotionRef.current &&
        isDesktopRef.current &&
        enableLoopRef.current &&
        loopWidthRef.current > 0
      ) {
        if (lastFrameRef.current == null) {
          lastFrameRef.current = timestamp;
        } else {
          const delta = timestamp - lastFrameRef.current;
          lastFrameRef.current = timestamp;
          const speed = loopWidthRef.current / AUTO_SCROLL_CYCLE_MS;
          track.scrollLeft += speed * delta;
          if (track.scrollLeft >= loopWidthRef.current) {
            track.scrollLeft -= loopWidthRef.current;
          }
        }
      } else {
        lastFrameRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enableAutoScroll]);

  if (items.length === 0) return null;

  function pauseInteraction() {
    pausedRef.current = true;
    lastFrameRef.current = null;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }

  function scheduleResumeInteraction() {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      if (
        !reducedMotionRef.current &&
        enableAutoScrollRef.current &&
        isDesktopRef.current &&
        !isDraggingRef.current
      ) {
        pausedRef.current = false;
        lastFrameRef.current = null;
      }
    }, RESUME_IDLE_MS);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = event.clientX;
    scrollStartRef.current = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
    pauseInteraction();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    const delta = event.clientX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
    }
    track.scrollLeft = scrollStartRef.current - delta;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    trackRef.current?.releasePointerCapture(event.pointerId);
    scheduleResumeInteraction();
  }

  function handleWheel() {
    pauseInteraction();
    scheduleResumeInteraction();
  }

  function handleScroll() {
    if (isDraggingRef.current) return;
    pauseInteraction();
    scheduleResumeInteraction();
  }

  function handleFocusCapture() {
    pauseInteraction();
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    scheduleResumeInteraction();
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
      onMouseEnter={pauseInteraction}
      onMouseLeave={scheduleResumeInteraction}
    >
      <div
        ref={trackRef}
        className="home-category-rail__track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={pauseInteraction}
        onTouchEnd={scheduleResumeInteraction}
        onWheel={handleWheel}
        onScroll={handleScroll}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
        onClickCapture={handleClickCapture}
      >
        {items.map(({ category, key, isDuplicate }) => (
          <CategoryRailCard
            key={key}
            category={category}
            isDuplicate={isDuplicate}
          />
        ))}
      </div>
    </div>
  );
}
