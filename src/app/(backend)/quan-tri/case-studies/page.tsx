import AdminShell from "@/components/admin/AdminShell";
import CaseStudiesManager from "@/components/admin/CaseStudiesManager";

export default function CaseStudiesPage() {
  return (
    <AdminShell title="Dự án tiêu biểu">
      <CaseStudiesManager />
    </AdminShell>
  );
}
