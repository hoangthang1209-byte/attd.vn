import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingOverviewDashboard from "@/components/admin/pricing/PricingOverviewDashboard";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tính giá");

export default function PricingOverviewPage() {
  return (
    <>
      <AdminPageTitle title={"Tính giá"} />
      <PricingOverviewDashboard />
    </>
  );
}
