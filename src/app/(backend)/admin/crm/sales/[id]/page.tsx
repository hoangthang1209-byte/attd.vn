import AdminPageTitle from "@/components/admin/AdminPageTitle";
import SalesRepresentativeForm from "@/components/admin/sales/SalesRepresentativeForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditSalesRepPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Sửa nhân viên tư vấn"} />
      <SalesRepresentativeForm mode="edit" salesRepId={id} />
    </>
  );
}
