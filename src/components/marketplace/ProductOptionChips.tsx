type VariantChipSource = {
  colorName?: string | null;
  colorCode?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
};

type ProductOptionChipsProps = {
  variants: VariantChipSource[];
  material?: string | null;
};

function uniqueValues(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

export default function ProductOptionChips({
  variants,
  material,
}: ProductOptionChipsProps) {
  const colors = uniqueValues(variants.map((v) => v.colorName));
  const sizes = uniqueValues(
    variants.map((v) => v.sizeName ?? v.capacity ?? v.dimensions)
  );

  if (colors.length === 0 && sizes.length === 0 && !material) return null;

  return (
    <div className="mp-pdp-option-chips">
      {colors.length > 0 && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Màu sắc</p>
          <div className="mp-pdp-chip-list">
            {colors.map((color) => {
              const variant = variants.find((v) => v.colorName === color);
              return (
                <span key={color} className="mp-pdp-chip mp-pdp-chip--color">
                  {variant?.colorCode && (
                    <span
                      className="mp-pdp-chip-dot"
                      style={{
                        background: variant.colorCode.startsWith("#")
                          ? variant.colorCode
                          : undefined,
                      }}
                    />
                  )}
                  {color}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Size / Kích thước / Dung tích</p>
          <div className="mp-pdp-chip-list">
            {sizes.map((size) => (
              <span key={size} className="mp-pdp-chip">
                {size}
              </span>
            ))}
          </div>
        </div>
      )}

      {material && (
        <div className="mp-pdp-chip-group">
          <p className="mp-pdp-chip-label">Chất liệu</p>
          <div className="mp-pdp-chip-list">
            <span className="mp-pdp-chip mp-pdp-chip--material">{material}</span>
          </div>
        </div>
      )}
    </div>
  );
}
