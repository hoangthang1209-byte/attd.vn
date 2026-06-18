import Link from "next/link";
import Image from "next/image";
import { categoryDemoImages } from "@/features/demo/demo-image-map";
import { isValidImageSrc } from "@/lib/imagePaths";

const CHIPS = [
  { slug: "ao-thun-tron", label: "Áo thun", href: "/ao-thun-tron" },
  { slug: "ao-polo-tron", label: "Polo", href: "/ao-polo-tron" },
  { slug: "non", label: "Nón", href: "/non" },
  { slug: "tote", label: "Tote", href: "/tote" },
  { slug: "bandana", label: "Bandana", href: "/bandana" },
  { slug: "binh-giu-nhiet", label: "Bình giữ nhiệt", href: "/binh-giu-nhiet" },
  { slug: "gift-set-doanh-nghiep", label: "Gift set", href: "/gift-set-doanh-nghiep" },
  { slug: "oem", label: "OEM", href: "/oem" },
];

const GRADIENTS: Record<string, string> = {
  "ao-thun-tron": "linear-gradient(145deg, #dc2626, #991b1b)",
  "ao-polo-tron": "linear-gradient(145deg, #1d4ed8, #1e3a8a)",
  non: "linear-gradient(145deg, #16a34a, #14532d)",
  tote: "linear-gradient(145deg, #d97706, #92400e)",
  bandana: "linear-gradient(145deg, #7c3aed, #4c1d95)",
  "binh-giu-nhiet": "linear-gradient(145deg, #0891b2, #164e63)",
  "gift-set-doanh-nghiep": "linear-gradient(145deg, #be185d, #831843)",
  oem: "linear-gradient(145deg, #374151, #111827)",
};

type MarketplaceCategoryChipsProps = {
  className?: string;
};

export default function MarketplaceCategoryChips({ className = "" }: MarketplaceCategoryChipsProps) {
  return (
    <nav className={`mp-cat-chips ${className}`.trim()} aria-label="Danh mục nhanh">
      <div className="mp-cat-chips-scroll">
        {CHIPS.map((chip) => {
          const img = categoryDemoImages[chip.slug];
          const hasImg = img && isValidImageSrc(img);
          const bg = GRADIENTS[chip.slug] ?? GRADIENTS.oem;

          return (
            <Link key={chip.slug} href={chip.href} className="mp-cat-chip">
              <span className="mp-cat-chip-img">
                {hasImg ? (
                  <Image src={img} alt="" fill className="mp-cat-chip-photo" sizes="72px" />
                ) : (
                  <span className="mp-cat-chip-fallback" style={{ background: bg }} aria-hidden />
                )}
              </span>
              <span className="mp-cat-chip-label">{chip.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
