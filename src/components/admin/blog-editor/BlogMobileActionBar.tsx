"use client";

type BlogMobileActionBarProps = {
  onInsert: () => void;
  onImage: () => void;
  onFaq: () => void;
  onCta: () => void;
};

export default function BlogMobileActionBar({
  onInsert,
  onImage,
  onFaq,
  onCta,
}: BlogMobileActionBarProps) {
  return (
    <div className="admin-mobile-editor-bar">
      <button type="button" onClick={onInsert}>
        Insert
      </button>
      <button type="button" onClick={onImage}>
        Image
      </button>
      <button type="button" onClick={onFaq}>
        FAQ
      </button>
      <button type="button" onClick={onCta}>
        CTA
      </button>
    </div>
  );
}
