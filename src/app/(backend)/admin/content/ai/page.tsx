import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ContentAiAdminClient from "@/components/admin/content/ContentAiAdminClient";
import { listPromptTemplates } from "@/features/content-generation/prompts/prompt-registry";

/** Sprint 18.0 — prompt registry is a static in-memory list, so it's read server-side (no API round-trip needed). */
export default function ContentAiAdminPage() {
  const prompts = listPromptTemplates().map((p) => ({
    id: p.id,
    type: p.type,
    version: p.version,
    maxOutputLength: p.maxOutputLength,
    prohibitedClaimCount: p.prohibitedClaims.length,
  }));

  return (
    <>
      <AdminPageTitle title="AI vận hành" />
      <ContentAiAdminClient prompts={prompts} />
    </>
  );
}
