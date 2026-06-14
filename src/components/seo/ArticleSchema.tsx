import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, canonicalUrl } from "@/lib/seo";

const ORG_PUBLISHER = {
  "@type": "Organization" as const,
  name: SITE_NAME,
  url: SITE_URL,
  telephone: "+84934337667",
  contactPoint: {
    "@type": "ContactPoint" as const,
    telephone: "+84934337667",
    contactType: "customer service",
    areaServed: "VN",
    availableLanguage: "Vietnamese",
  },
  sameAs: ["https://zalo.me/0934337667"],
};

type ArticleSchemaProps = {
  headline: string;
  description: string;
  slug: string;
  image?: string | null;
  datePublished: string;
  dateModified: string;
};

export default function ArticleSchema({
  headline,
  description,
  slug,
  image,
  datePublished,
  dateModified,
}: ArticleSchemaProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    ...(image ? { image } : {}),
    datePublished,
    dateModified,
    author: ORG_PUBLISHER,
    publisher: ORG_PUBLISHER,
    url: canonicalUrl(`/blog/${slug}`),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function buildArticleDescription(
  metaDescription?: string | null,
  excerpt?: string | null
): string {
  return metaDescription ?? excerpt ?? DEFAULT_DESCRIPTION;
}
