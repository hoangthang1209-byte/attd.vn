"use client";

import { useEffect, useState } from "react";

type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
};

function readAnchorOffsetPx(): number {
  const pdp = document.querySelector(".mp-pdp--b2b");
  if (!pdp) return 220;
  const parsed = Number.parseFloat(
    getComputedStyle(pdp).getPropertyValue("--pdp-anchor-offset").trim(),
  );
  return Number.isFinite(parsed) ? parsed : 220;
}

/** Correct hash landing only when the heading is hidden under sticky chrome. */
function correctHashLanding(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const tabs = document.querySelector(".mp-pdp-tabs--in-shell");
  const title = section.querySelector(".mp-pdp-section-title, h2");
  if (!tabs || !title) return;

  const tabsBottom = tabs.getBoundingClientRect().bottom;
  const titleTop = title.getBoundingClientRect().top;
  // Already fully visible below sticky tabs — do nothing (avoids jump).
  if (titleTop >= tabsBottom - 2 && titleTop < window.innerHeight * 0.9) return;

  // Prefer the resolved CSS scroll-margin (primary mechanism).
  const margin = Number.parseFloat(getComputedStyle(section).scrollMarginTop);
  const offset = Number.isFinite(margin) ? margin : readAnchorOffsetPx();
  const top = window.scrollY + section.getBoundingClientRect().top - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
}

export default function ProductDetailTabs({ tabs }: Props) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    if (!tabs.length) return;

    const sectionEls = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sectionEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.15, 0.35, 0.55],
      },
    );

    for (const el of sectionEls) observer.observe(el);
    return () => observer.disconnect();
  }, [tabs]);

  useEffect(() => {
    const tabIds = new Set(tabs.map((tab) => tab.id));
    const timers: number[] = [];

    function syncFromHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!id || !tabIds.has(id)) return;
      setActiveId(id);

      const run = () => correctHashLanding(id);
      // Instant correction — avoids fighting html { scroll-behavior: smooth }.
      const previousBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          run();
          document.documentElement.style.scrollBehavior = previousBehavior;
        });
      });
      // Catch late native hash scrolls after hydration/layout.
      timers.push(window.setTimeout(run, 120));
      timers.push(window.setTimeout(run, 400));
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [tabs]);

  if (!tabs.length) return null;

  return (
    <nav className="mp-pdp-tabs mp-pdp-tabs--in-shell" aria-label="Mục chi tiết sản phẩm">
      <div className="mp-pdp-content-container mp-pdp-tabs-inner">
        <div className="mp-pdp-tabs-scroll">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`mp-pdp-tab${activeId === tab.id ? " mp-pdp-tab--active" : ""}`}
              aria-current={activeId === tab.id ? "location" : undefined}
              onClick={(event) => {
                if (activeId === tab.id) {
                  const section = document.getElementById(tab.id);
                  const tabsEl = document.querySelector(".mp-pdp-tabs--in-shell");
                  const title = section?.querySelector(".mp-pdp-section-title, h2");
                  if (
                    section &&
                    tabsEl &&
                    title &&
                    title.getBoundingClientRect().top >= tabsEl.getBoundingClientRect().bottom - 2 &&
                    title.getBoundingClientRect().top < window.innerHeight * 0.9
                  ) {
                    event.preventDefault();
                    return;
                  }
                }
                setActiveId(tab.id);
              }}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
