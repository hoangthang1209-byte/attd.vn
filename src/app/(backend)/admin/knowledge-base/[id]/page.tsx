import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeBaseEntryEditor from "@/components/admin/knowledge-base/KnowledgeBaseEntryEditor";
import { getKnowledgeBaseEntryById } from "@/features/knowledge-base/knowledge-base-seed";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditKnowledgeBaseEntryPage({ params }: Props) {
  const { id } = await params;
  const entry = await getKnowledgeBaseEntryById(id);
  if (!entry) notFound();

  return (
    <>
      <AdminPageTitle title={`Knowledge Base — ${entry.title}`} />
      <KnowledgeBaseEntryEditor mode="edit" entry={entry} />
    </>
  );
}
