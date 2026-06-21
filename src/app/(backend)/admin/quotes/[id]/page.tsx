import AdminPageTitle from "@/components/admin/AdminPageTitle";
import QuoteDetailView from "@/components/admin/quotes/QuoteDetailView";

type Props = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Chi tiết báo giá"} />
      <QuoteDetailView id={id} />
    </>
  );
}
