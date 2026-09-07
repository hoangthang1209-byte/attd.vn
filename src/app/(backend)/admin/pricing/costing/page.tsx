import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CostingCalculator from "@/components/admin/pricing/CostingCalculator";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tính giá");

export default function PricingCostingPage() {
  return (
    <>
      <AdminPageTitle title={"Tính giá"} />
      <CostingCalculator />
    </>
  );
}
