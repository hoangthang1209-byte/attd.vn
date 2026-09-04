import type { QuoteManufacturingEvidenceItem } from "@/features/quotes/types";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";

type Props = {
  items: QuoteManufacturingEvidenceItem[];
  absoluteMedia?: boolean;
  mediaBaseUrl?: string;
};

function shortText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

export default function QuoteDocumentManufacturingEvidence({
  items,
  absoluteMedia = false,
  mediaBaseUrl,
}: Props) {
  const safeItems = items
    .flatMap((item) => {
      const imageUrl = absoluteMedia
        ? resolveAbsoluteMediaUrl(item.imageUrl, mediaBaseUrl)
        : item.imageUrl;
      return imageUrl?.trim() ? [{ ...item, imageUrl }] : [];
    })
    .slice(0, 4);

  if (safeItems.length === 0) return null;

  return (
    <section className="quote-manufacturing-section">
      <div className="quote-manufacturing-section__head">
        <h2>Năng lực sản xuất thực tế</h2>
        <p>
          Một số hình ảnh quy trình sản xuất, kiểm tra chất lượng và đóng gói tại ATTD.
        </p>
      </div>
      <div className="quote-manufacturing-grid">
        {safeItems.map((item) => (
          <article key={item.id} className="quote-manufacturing-card">
            <div className="quote-manufacturing-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- quote/PDF document uses plain img for print fidelity */}
              <img
                src={item.imageUrl}
                alt={item.alt || item.title}
                className="quote-manufacturing-media__img"
                width={320}
                height={200}
                loading="eager"
              />
            </div>
            <div className="quote-manufacturing-card__body">
              <p className="quote-manufacturing-category">
                {item.categoryName ?? "Sản xuất"}
              </p>
              <h3 className="quote-manufacturing-title">{item.title}</h3>
              {item.description ? (
                <p className="quote-manufacturing-description">
                  {shortText(item.description, 120)}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
