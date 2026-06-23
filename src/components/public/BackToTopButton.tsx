"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const SHOW_AFTER_PX = 600;

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      type="button"
      className={`floating-contact-btn floating-contact-btn--top${visible ? " is-visible" : ""}`}
      onClick={scrollToTop}
      title="Về đầu trang"
      aria-label="Về đầu trang"
    >
      <ChevronUp size={20} aria-hidden />
    </button>
  );
}
