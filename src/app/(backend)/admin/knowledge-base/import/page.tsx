import AdminShell from "@/components/admin/AdminShell";
import KnowledgeBaseBulkImport from "@/components/admin/knowledge-base/KnowledgeBaseBulkImport";

export default function KnowledgeBaseImportPage() {
  return (
    <AdminShell title="Knowledge Base — Nhập dữ liệu hàng loạt">
      <KnowledgeBaseBulkImport />
    </AdminShell>
  );
}
