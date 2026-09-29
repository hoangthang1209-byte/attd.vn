import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingCalculator from "@/components/admin/pricing/PricingCalculator";

export default function PricingCalculatorPage() {
  return (
    <>
      <AdminPageTitle title={"Tính theo bảng giá / quy tắc"} />
      <PricingCalculator />
    </>
  );
}
