import { SITE_URL } from "@/lib/seo";
import type { BreadcrumbItem } from "./Breadcrumb";

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

/** Renders BreadcrumbList JSON-LD without visual breadcrumb chrome. */
export default function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const allItems: BreadcrumbItem[] = [{ name: "Trang chủ", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
