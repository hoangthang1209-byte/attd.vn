import { SITE_URL } from "@/lib/seo";

export interface ItemListEntry {
  position: number;
  name: string;
  slug: string;
}

interface ItemListSchemaProps {
  items: ItemListEntry[];
}

export default function ItemListSchema({ items }: ItemListSchemaProps) {
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: `${SITE_URL}/san-pham/${item.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
