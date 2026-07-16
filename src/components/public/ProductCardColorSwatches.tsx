import type { ProductCardColorSwatch } from "@/features/products/product-card-color-swatches";
import {
  isLightColorSwatch,
  sanitizeCssHexColor,
  splitVisibleColorSwatches,
} from "@/features/products/product-card-color-swatches";

type Props = {
  colors: ProductCardColorSwatch[];
  compact?: boolean;
};

export default function ProductCardColorSwatches({ colors, compact = false }: Props) {
  if (!colors.length) return null;

  const { visible, overflowCount } = splitVisibleColorSwatches(colors);

  return (
    <ul
      className={["product-card-colors", compact ? "product-card-colors--compact" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label="Màu sắc có sẵn"
    >
      {visible.map((color) => {
        const hex = sanitizeCssHexColor(color.hex);
        const needsBorder = !hex || isLightColorSwatch(hex);
        const initial = color.name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "?";

        return (
          <li key={color.id} className="product-card-colors__item">
            <span
              className={[
                "product-card-swatch",
                hex ? "product-card-swatch--filled" : "product-card-swatch--fallback",
                needsBorder ? "product-card-swatch--bordered" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={hex ? { backgroundColor: hex } : undefined}
              title={`Màu ${color.name}`}
              aria-label={`Màu ${color.name}`}
            >
              {!hex && (
                <span className="product-card-swatch__initial" aria-hidden="true">
                  {initial}
                </span>
              )}
            </span>
          </li>
        );
      })}
      {overflowCount > 0 && (
        <li className="product-card-colors__item">
          <span className="product-card-colors__more" aria-label={`Thêm ${overflowCount} màu`}>
            +{overflowCount}
          </span>
        </li>
      )}
    </ul>
  );
}
