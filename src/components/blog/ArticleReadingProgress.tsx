"use client";

import { useEffect, useRef, useState } from "react";

type ArticleReadingProgressProps = {
  /** Element id of the article body being tracked. */
  targetId: string;
};

/**
 * A hairline bar under the header showing how far through the article the
 * reader is. Uses no data of its own and updates on an animation frame, so it
 * costs one passive scroll listener for the whole page.
 */
export default function ArticleReadingProgress({ targetId }: ArticleReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    function measure() {
      frame.current = null;
      const element = document.getElementById(targetId);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const scrolled = -rect.top;
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(rect.top <= 0 ? 100 : 0);
        return;
      }

      setProgress(Math.min(100, Math.max(0, (scrolled / scrollable) * 100)));
    }

    function onScroll() {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [targetId]);

  return (
    <div className="article-progress" aria-hidden="true">
      <div className="article-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}
