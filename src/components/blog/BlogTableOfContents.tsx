"use client";

import { useState } from "react";
import type { TocHeading } from "@/features/blog/content-processor";

type BlogTableOfContentsProps = {
  headings: TocHeading[];
};

export default function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  }

  return (
    <nav className="blog-toc" aria-label="Mục lục bài viết">
      <button
        type="button"
        className="blog-toc-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Mục lục
        <span className="blog-toc-toggle-icon">{open ? "−" : "+"}</span>
      </button>

      <div className={`blog-toc-panel ${open ? "blog-toc-panel--open" : ""}`}>
        <p className="blog-toc-title">Mục lục</p>
        <ol className="blog-toc-list">
          {headings.map((heading, index) => (
            <li
              key={heading.id}
              className={
                heading.level === 3 ? "blog-toc-item blog-toc-item--h3" : "blog-toc-item"
              }
            >
              <button type="button" onClick={() => scrollTo(heading.id)}>
                {index + 1}. {heading.text}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
