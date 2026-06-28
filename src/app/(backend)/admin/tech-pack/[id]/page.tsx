import AdminPageTitle from "@/components/admin/AdminPageTitle";
import TechPackDetailManager from "@/components/admin/tech-pack/TechPackDetailManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function TechPackDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Chi tiết Tech Pack" />
      <TechPackDetailManager techPackId={id} />
    </>
  );
}
