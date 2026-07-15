import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeGraphHealthClient from "@/components/admin/knowledge-graph/KnowledgeGraphHealthClient";

export const dynamic = "force-dynamic";

export default function KnowledgeGraphHealthPage() {
  return (
    <>
      <AdminPageTitle title="Knowledge Graph health" />
      <KnowledgeGraphHealthClient />
    </>
  );
}
