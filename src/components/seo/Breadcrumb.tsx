import Link from "next/link";
import { SITE_URL } from "@/lib/seo";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [{ name: "Trang chủ", href: "/" }, ...items];
  const lastIndex = allItems.length - 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      // Include item URL for all entries that have an href — including the current page
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav
        aria-label="Điều hướng breadcrumb"
        style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}
      >
        <div
          className="container"
          style={{
            padding: "12px 24px",
            fontSize: "13px",
            color: "#6b7280",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {allItems.map((item, index) => {
            const isCurrent = index === lastIndex;
            return (
              <span
                key={index}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {index > 0 && <span aria-hidden="true">/</span>}
                {item.href && !isCurrent ? (
                  <Link
                    href={item.href}
                    style={{ color: "#6b7280", textDecoration: "none" }}
                  >
                    {item.name}
                  </Link>
                ) : (
                  // Last item is always rendered as plain text (current page)
                  <span
                    style={{ color: "#111827", fontWeight: 500 }}
                    aria-current="page"
                  >
                    {item.name}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </nav>
    </>
  );
}
