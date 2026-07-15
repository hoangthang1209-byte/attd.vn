import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeGraphRelationshipsClient from "@/components/admin/knowledge-graph/KnowledgeGraphRelationshipsClient";

export const dynamic = "force-dynamic";

export default function KnowledgeGraphRelationshipsPage() {
  return (
    <>
      <AdminPageTitle title="Knowledge Graph — Relationship queue" />
      <KnowledgeGraphRelationshipsClient />
    </>
  );
}
