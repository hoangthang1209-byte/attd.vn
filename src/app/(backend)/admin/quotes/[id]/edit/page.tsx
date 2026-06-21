import AdminPageTitle from "@/components/admin/AdminPageTitle";
import QuoteForm from "@/components/admin/quotes/QuoteForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditQuotePage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Chỉnh sửa báo giá"} />
      <QuoteForm mode="edit" quoteId={id} />
    </>
  );
}
