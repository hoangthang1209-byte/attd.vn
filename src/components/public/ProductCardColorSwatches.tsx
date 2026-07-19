import type { ProductCardColorSwatch } from "@/features/products/product-card-color-swatches";
import {
  isLightColorSwatch,
  resolveStructuredSwatchHex,
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
        const hex = resolveStructuredSwatchHex(color.hex);
        const needsBorder = isLightColorSwatch(hex);

        return (
          <li key={color.id} className="product-card-colors__item">
            <span
              className={[
                "product-card-swatch",
                "product-card-swatch--filled",
                needsBorder ? "product-card-swatch--bordered" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ backgroundColor: hex }}
              title={`Màu ${color.name}`}
              aria-label={`Màu ${color.name}`}
            />
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
