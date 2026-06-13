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
    <Link href={`/${slug}`} className="premium-card" style={{ color: "inherit" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          color: "#111827",
        }}
      >
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: "16px",
          color: "#111827",
          letterSpacing: "-0.01em",
        }}
      >
        {name}
      </div>
    </Link>
  );
}
