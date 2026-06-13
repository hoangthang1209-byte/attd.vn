import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";

type CategoryCardProps = {
  name: string;
  slug: string;
  icon?: LucideIcon;
};

export default function CategoryCard({
  name,
  slug,
  icon: Icon = Package,
}: CategoryCardProps) {
  return (
    <Link href={`/${slug}`} className="category-card">
      <div className="category-card-icon" aria-hidden>
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div className="category-card-body">
        <h3 className="category-card-title">{name}</h3>
        <span className="category-card-cta">Xem danh mục →</span>
      </div>
    </Link>
  );
}
