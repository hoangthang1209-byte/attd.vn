import AdminShell from "@/components/admin/AdminShell";
import SeoBriefGenerator from "@/components/admin/seo/SeoBriefGenerator";

export default function SeoBriefGeneratorPage() {
  return (
    <AdminShell title="Trình tạo SEO Brief">
      <SeoBriefGenerator />
    </AdminShell>
  );
}
