import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeGraphEvaluationClient from "@/components/admin/knowledge-graph/KnowledgeGraphEvaluationClient";

export const dynamic = "force-dynamic";

export default function KnowledgeGraphEvaluationPage() {
  return (
    <>
      <AdminPageTitle title="Knowledge Graph — Retrieval evaluation" />
      <KnowledgeGraphEvaluationClient />
    </>
  );
}
