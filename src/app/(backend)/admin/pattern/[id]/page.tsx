import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PatternDetailManager from "@/components/admin/patterns/PatternDetailManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function PatternDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Chi tiết rập" />
      <PatternDetailManager patternId={id} />
    </>
  );
}
