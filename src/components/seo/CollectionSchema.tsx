import { SITE_NAME } from "@/lib/seo";

interface CollectionSchemaProps {
  title: string;
  description: string;
  url: string;
}

export default function CollectionSchema({
  title,
  description,
  url,
}: CollectionSchemaProps) {
  const jsonLd = {
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
