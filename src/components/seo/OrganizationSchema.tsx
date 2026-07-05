import { getOrganizationJsonLd } from "@/lib/organization-schema";

export default async function OrganizationSchema() {
  const orgJsonLd = await getOrganizationJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
    />
  );
}
