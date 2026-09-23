import { getOrganizationJsonLd, organizationEntityFromJsonLd } from "@/lib/organization-schema";
import { DEFAULT_DESCRIPTION, canonicalUrl } from "@/lib/seo";

type ArticleSchemaProps = {
  headline: string;
  description: string;
  slug: string;
  image?: string | null;
  datePublished: string;
  dateModified: string;
};

export function buildArticleJsonLd(
  {
    headline,
    description,
    slug,
    image,
    datePublished,
    dateModified,
  }: ArticleSchemaProps,
  organization: Record<string, unknown>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    ...(image ? { image } : {}),
    datePublished,
    dateModified,
    author: organization,
    publisher: organization,
    url: canonicalUrl(`/blog/${slug}`),
  };
}

export default async function ArticleSchema(props: ArticleSchemaProps) {
  const organization = organizationEntityFromJsonLd(await getOrganizationJsonLd());
  const jsonLd = buildArticleJsonLd(props, organization);

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
