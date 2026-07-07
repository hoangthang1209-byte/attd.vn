import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CostingCalculator from "@/components/admin/pricing/CostingCalculator";

export default function PricingCostingPage() {
  return (
    <>
      <AdminPageTitle title={"Costing & báo giá nhanh"} />
      <CostingCalculator />
    </>
  );
}
