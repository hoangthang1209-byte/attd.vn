import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeGraphEntityDetailClient from "@/components/admin/knowledge-graph/KnowledgeGraphEntityDetailClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function KnowledgeGraphEntityPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Knowledge Graph entity" />
      <KnowledgeGraphEntityDetailClient entityId={id} />
    </>
  );
}
