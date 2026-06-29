import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DealerCompanyDetailView from "@/components/admin/dealer/DealerCompanyDetailView";

type PageProps = { params: Promise<{ id: string }> };

export default async function DealerCompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Chi tiết đại lý" />
      <DealerCompanyDetailView companyId={id} />
    </>
  );
}
