import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

type CategoryMenuImageProps = {
  imageUrl: string | null | undefined;
  name: string;
  size?: "parent" | "child" | "mobile";
  className?: string;
};

export default function CategoryMenuImage({
  imageUrl,
  name,
  size = "child",
  className = "",
}: CategoryMenuImageProps) {
  const sizeClass =
    size === "parent"
      ? "mp-mega-cat-parent-thumb"
      : size === "mobile"
        ? "mobile-nav-category-child-img"
        : "mp-mega-cat-chip-img";

  if (imageUrl && isValidImageSrc(imageUrl)) {
    return (
      <span className={`${sizeClass} ${className}`.trim()}>
        <Image
          src={imageUrl}
          alt=""
          fill
          className={
            size === "mobile" ? "mobile-nav-category-child-photo" : "mp-mega-cat-chip-photo"
          }
          sizes={size === "parent" ? "40px" : size === "mobile" ? "48px" : "96px"}
        />
      </span>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "A";
  return (
    <span
      className={`${sizeClass} mp-mega-cat-placeholder ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="mp-mega-cat-placeholder__brand">ATTD</span>
      <span className="mp-mega-cat-placeholder__initial">{initial}</span>
    </span>
  );
}
