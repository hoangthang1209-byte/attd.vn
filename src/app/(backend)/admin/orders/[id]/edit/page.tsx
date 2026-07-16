import OrderForm from "@/components/admin/orders/OrderForm";
import { requireFinancialAdminPage } from "@/lib/admin-auth/require-financial-admin";

type Props = { params: Promise<{ id: string }> };

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params;
  await requireFinancialAdminPage(`/admin/orders/${id}/edit`, `/admin/orders/${id}`);
  return <OrderForm mode="edit" orderId={id} />;
}
