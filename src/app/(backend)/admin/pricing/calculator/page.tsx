import AdminShell from "@/components/admin/AdminShell";
import PricingCalculator from "@/components/admin/pricing/PricingCalculator";

export default function PricingCalculatorPage() {
  return (
    <AdminShell title="Bộ tính giá">
      <PricingCalculator />
    </AdminShell>
  );
}
