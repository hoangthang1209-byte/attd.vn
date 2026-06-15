import AdminShell from "@/components/admin/AdminShell";
import KnowledgeBaseEntryEditor from "@/components/admin/knowledge-base/KnowledgeBaseEntryEditor";

export default function NewKnowledgeBaseEntryPage() {
  return (
    <AdminShell title="Knowledge Base — Thêm dữ liệu">
      <KnowledgeBaseEntryEditor mode="create" />
    </AdminShell>
  );
}
