import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingOverviewDashboard from "@/components/admin/pricing/PricingOverviewDashboard";

export default function PricingOverviewPage() {
  return (
    <>
      <AdminPageTitle title={"Tính giá — Tổng quan"} />
      <PricingOverviewDashboard />
    </>
  );
}
