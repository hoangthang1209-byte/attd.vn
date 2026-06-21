import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingCalculator from "@/components/admin/pricing/PricingCalculator";

export default function PricingCalculatorPage() {
  return (
    <>
      <AdminPageTitle title={"Bộ tính giá"} />
      <PricingCalculator />
    </>
  );
}
