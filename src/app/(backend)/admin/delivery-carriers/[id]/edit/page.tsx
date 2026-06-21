import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryCarrierForm from "@/components/admin/delivery/DeliveryCarrierForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDeliveryCarrierEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Sửa đơn vị vận chuyển" />
      <DeliveryCarrierForm mode="edit" carrierId={id} />
    </>
  );
}
