import AdminShell from "@/components/admin/AdminShell";
import QuoteForm from "@/components/admin/quotes/QuoteForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditQuotePage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell title="Chỉnh sửa báo giá">
      <QuoteForm mode="edit" quoteId={id} />
    </AdminShell>
  );
}
