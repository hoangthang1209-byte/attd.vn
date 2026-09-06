"use client";

type Props = {
  src: string;
};

export default function QuoteDesignThumb({ src }: Props) {
  if (!src.trim()) {
    return <span className="quote-doc__muted" aria-hidden>—</span>;
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="quote-doc__design-thumb"
        width={56}
        height={64}
        loading="eager"
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const placeholder = img.nextElementSibling;
          if (placeholder instanceof HTMLElement) {
            placeholder.hidden = false;
          }
        }}
      />
      <span className="quote-doc__muted" hidden aria-hidden>
        —
      </span>
    </>
  );
}
