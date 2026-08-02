"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TocHeading } from "@/features/blog/content-processor";

type BlogTableOfContentsProps = {
  headings: TocHeading[];
};

type TocGroup = {
  heading: TocHeading;
  children: TocHeading[];
};

/** Group H3s under the H2 that precedes them. */
function buildGroups(headings: TocHeading[]): TocGroup[] {
  const groups: TocGroup[] = [];

  for (const heading of headings) {
    if (heading.level === 2 || groups.length === 0) {
      groups.push({ heading, children: [] });
      continue;
    }
    groups[groups.length - 1].children.push(heading);
  }

  return groups;
}

export default function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const listRef = useRef<HTMLOListElement>(null);

  const groups = useMemo(() => buildGroups(headings), [headings]);
  const ids = useMemo(() => headings.map((heading) => heading.id), [headings]);

  // One observer for the whole article rather than a scroll handler per heading.
  useEffect(() => {
    if (ids.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }

        if (visible.size > 0) {
          // The heading nearest the top of the reading area wins.
          const next = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActiveId(next);
          return;
        }

        // Between headings: keep the last one scrolled past.
        const passed = ids.filter((id) => {
          const element = document.getElementById(id);
          return element ? element.getBoundingClientRect().top < 120 : false;
        });
        if (passed.length > 0) setActiveId(passed[passed.length - 1]);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [ids]);

  // Keep the highlighted entry inside the scrollable panel.
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const entry = listRef.current.querySelector<HTMLElement>(`[data-toc-id="${CSS.escape(activeId)}"]`);
    if (!entry) return;

    const panel = listRef.current;
    const entryTop = entry.offsetTop - panel.offsetTop;
    if (entryTop < panel.scrollTop || entryTop > panel.scrollTop + panel.clientHeight - 48) {
      panel.scrollTo({ top: Math.max(0, entryTop - panel.clientHeight / 2), behavior: "smooth" });
    }
  }, [activeId]);

  const handleNavigate = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setMobileOpen(false);
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="blog-toc" aria-label="Mục lục bài viết">
      <button
        type="button"
        className="blog-toc-toggle"
        aria-expanded={mobileOpen}
        aria-controls="blog-toc-panel"
        onClick={() => setMobileOpen((value) => !value)}
      >
        <span>Mục lục</span>
        <span className="blog-toc-toggle-count">{headings.length} mục</span>
        <span className="blog-toc-toggle-icon" aria-hidden="true" />
      </button>

      <div
        id="blog-toc-panel"
        className={`blog-toc-panel ${mobileOpen ? "blog-toc-panel--open" : ""}`}
      >
        <p className="blog-toc-title">Trong bài viết này</p>

        <ol className="blog-toc-list" ref={listRef}>
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.heading.id);
            const groupActive =
              activeId === group.heading.id ||
              group.children.some((child) => child.id === activeId);

            return (
              <li key={group.heading.id} className="blog-toc-group">
                <div className="blog-toc-row">
                  <a
                    href={`#${group.heading.id}`}
                    data-toc-id={group.heading.id}
                    className={`blog-toc-link ${groupActive ? "is-active" : ""}`}
                    aria-current={activeId === group.heading.id ? "location" : undefined}
                    onClick={(event) => handleNavigate(event, group.heading.id)}
                  >
                    {group.heading.text}
                  </a>

                  {group.children.length > 0 && (
                    <button
                      type="button"
                      className="blog-toc-branch"
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed
                          ? `Mở mục con của ${group.heading.text}`
                          : `Thu gọn mục con của ${group.heading.text}`
                      }
                      onClick={() => toggleGroup(group.heading.id)}
                    />
                  )}
                </div>

                {group.children.length > 0 && !isCollapsed && (
                  <ol className="blog-toc-sublist">
                    {group.children.map((child) => (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          data-toc-id={child.id}
                          className={`blog-toc-link blog-toc-link--child ${
                            activeId === child.id ? "is-active" : ""
                          }`}
                          aria-current={activeId === child.id ? "location" : undefined}
                          onClick={(event) => handleNavigate(event, child.id)}
                        >
                          {child.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
