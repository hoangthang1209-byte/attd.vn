import AdminPageTitle from "@/components/admin/AdminPageTitle";
import KnowledgeBaseBulkImport from "@/components/admin/knowledge-base/KnowledgeBaseBulkImport";

export default function KnowledgeBaseImportPage() {
  return (
    <>
      <AdminPageTitle title={"Knowledge Base — Nhập dữ liệu hàng loạt"} />
      <KnowledgeBaseBulkImport />
    </>
  );
}
