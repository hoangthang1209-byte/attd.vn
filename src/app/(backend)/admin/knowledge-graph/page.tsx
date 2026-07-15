import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeGraphDashboardClient from "@/components/admin/knowledge-graph/KnowledgeGraphDashboardClient";

export const dynamic = "force-dynamic";

export default function KnowledgeGraphPage() {
  return (
    <>
      <AdminPageTitle title="Knowledge Graph — Enterprise overlay" />
      <KnowledgeGraphDashboardClient />
    </>
  );
}
