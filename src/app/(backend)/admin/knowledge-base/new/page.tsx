import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeBaseEntryEditor from "@/components/admin/knowledge-base/KnowledgeBaseEntryEditor";

export default function NewKnowledgeBaseEntryPage() {
  return (
    <>
      <AdminPageTitle title={"Knowledge Base — Thêm dữ liệu"} />
      <KnowledgeBaseEntryEditor mode="create" />
    </>
  );
}
