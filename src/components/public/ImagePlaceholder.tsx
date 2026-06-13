import type { PlaceholderVariant } from "@/lib/imagePaths";

type ImagePlaceholderProps = {
  variant?: PlaceholderVariant;
  label?: string;
  compact?: boolean;
  className?: string;
};

export default function ImagePlaceholder({
  variant = "generic",
  label,
  compact = false,
  className = "",
}: ImagePlaceholderProps) {
  const displayLabel =
    label ??
    (variant === "product"
      ? "ATTD"
      : variant === "category"
        ? "Danh mục"
        : variant === "client"
          ? "Đối tác"
          : "ATTD");

  return (
    <div
      className={`image-placeholder image-placeholder--${variant}${compact ? " image-placeholder--compact" : ""} ${className}`}
      aria-hidden={variant !== "product"}
    >
      <span className="image-placeholder-mark">ATTD</span>
      {!compact && (
        <span className="image-placeholder-label">{displayLabel}</span>
      )}
      {compact && (
        <span className="image-placeholder-label-compact">{displayLabel}</span>
      )}
    </div>
  );
}
