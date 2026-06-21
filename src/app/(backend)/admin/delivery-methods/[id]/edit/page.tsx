import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryMethodForm from "@/components/admin/delivery/DeliveryMethodForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDeliveryMethodEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Sửa hình thức giao hàng"} />
      <DeliveryMethodForm mode="edit" methodId={id} />
    </>
  );
}
