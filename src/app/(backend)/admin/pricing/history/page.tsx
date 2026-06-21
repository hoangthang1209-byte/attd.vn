import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingHistoryList from "@/components/admin/pricing/PricingHistoryList";

export default function PricingHistoryPage() {
  return (
    <>
      <AdminPageTitle title={"Lịch sử tính giá"} />
      <PricingHistoryList />
    </>
  );
}
