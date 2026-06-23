"use client";

import { useEffect, useState } from "react";

type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
};

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

  if (!tabs.length) return null;

  return (
    <nav className="mp-pdp-tabs mp-pdp-tabs--in-shell" aria-label="Mục chi tiết sản phẩm">
      <div className="mp-pdp-tabs-inner">
        <div className="mp-pdp-tabs-scroll">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`mp-pdp-tab${activeId === tab.id ? " mp-pdp-tab--active" : ""}`}
              aria-current={activeId === tab.id ? "location" : undefined}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
