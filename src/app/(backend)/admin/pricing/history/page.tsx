import AdminShell from "@/components/admin/AdminShell";
import PricingHistoryList from "@/components/admin/pricing/PricingHistoryList";

export default function PricingHistoryPage() {
  return (
    <AdminShell title="Lịch sử tính giá">
      <PricingHistoryList />
    </AdminShell>
  );
}
