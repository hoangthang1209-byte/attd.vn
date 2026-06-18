import AdminShell from "@/components/admin/AdminShell";
import PricingOverviewDashboard from "@/components/admin/pricing/PricingOverviewDashboard";

export default function PricingOverviewPage() {
  return (
    <AdminShell title="Tính giá — Tổng quan">
      <PricingOverviewDashboard />
    </AdminShell>
  );
}
