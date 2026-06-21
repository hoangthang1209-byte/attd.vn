import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PricingCalculationDetail from "@/components/admin/pricing/PricingCalculationDetail";

type Props = { params: Promise<{ id: string }> };

export default async function PricingHistoryDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Chi tiết bản tính giá"} />
      <PricingCalculationDetail id={id} />
    </>
  );
}
