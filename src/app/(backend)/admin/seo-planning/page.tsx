import AdminShell from "@/components/admin/AdminShell";
import SeoPlanningDashboard from "@/components/admin/seo/SeoPlanningDashboard";

export default function SeoPlanningPage() {
  return (
    <AdminShell title="SEO Planning">
      <SeoPlanningDashboard />
    </AdminShell>
  );
}
