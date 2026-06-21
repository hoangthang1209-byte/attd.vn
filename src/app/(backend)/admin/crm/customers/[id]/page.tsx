import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmCustomerDetailView from "@/components/admin/crm/CrmCustomerDetailView";
import { getCustomerById } from "@/features/crm/services/crm-customer.service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <>
      <AdminPageTitle title={`Khách hàng: ${customer.name}`} />
      <CrmCustomerDetailView initialCustomer={customer} />
    </>
  );
}
