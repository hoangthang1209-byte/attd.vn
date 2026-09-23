import { SITE_NAME } from "@/lib/seo";

interface CollectionSchemaProps {
  title: string;
  description: string;
  url: string;
}

export function buildCollectionPageJsonLd({
  title,
  description,
  url,
}: CollectionSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export default function CollectionSchema(props: CollectionSchemaProps) {
  const jsonLd = buildCollectionPageJsonLd(props);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
