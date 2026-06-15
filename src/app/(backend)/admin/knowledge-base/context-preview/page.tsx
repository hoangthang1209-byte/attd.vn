import KnowledgeBaseContextSearch from "@/components/admin/knowledge-base/KnowledgeBaseContextSearch";

export const metadata = {
  title: "Xem trước ngữ cảnh AI | Knowledge Base",
};

export default function KnowledgeBaseContextPreviewPage() {
  return (
    <div className="admin-page">
      <KnowledgeBaseContextSearch />
    </div>
  );
}
