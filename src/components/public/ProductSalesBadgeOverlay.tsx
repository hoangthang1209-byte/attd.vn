import { Factory, Flame, Layers, Printer, Sparkles } from "lucide-react";
import type { PublicProductSalesBadge, ProductSalesBadgeIcon } from "@/features/products/product-sales-badges";

type Props = {
  badges: PublicProductSalesBadge[];
  compact?: boolean;
};

function BadgeIcon({ icon }: { icon?: ProductSalesBadgeIcon }) {
  const size = 12;
  const stroke = 2;
  switch (icon) {
    case "moq":
      return <Layers size={size} strokeWidth={stroke} aria-hidden="true" />;
    case "print":
      return <Printer size={size} strokeWidth={stroke} aria-hidden="true" />;
    case "factory":
      return <Factory size={size} strokeWidth={stroke} aria-hidden="true" />;
    case "flame":
      return <Flame size={size} strokeWidth={stroke} aria-hidden="true" />;
    case "sparkle":
      return <Sparkles size={size} strokeWidth={stroke} aria-hidden="true" />;
    default:
      return null;
  }
}

export default function ProductSalesBadgeOverlay({ badges, compact = false }: Props) {
  if (badges.length === 0) return null;

  return (
    <div
      className={`product-card-sales-badges${compact ? " product-card-sales-badges--compact" : ""}`}
      aria-hidden="true"
    >
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`product-card-sales-badge${
            badge.key === "MOQ" ? " product-card-sales-badge--moq" : ""
          }`}
        >
          {badge.icon ? (
            <span className="product-card-sales-badge-icon">
              <BadgeIcon icon={badge.icon} />
            </span>
          ) : null}
          <span className="product-card-sales-badge-label">{badge.label}</span>
        </span>
      ))}
    </div>
  );
}
