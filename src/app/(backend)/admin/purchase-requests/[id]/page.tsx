import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PurchaseRequestDetail from "@/components/admin/materials/PurchaseRequestDetail";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPurchaseRequestDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Chi tiết yêu cầu mua hàng" />
      <PurchaseRequestDetail requestId={id} />
    </>
  );
}
