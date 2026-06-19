import AdminShell from "@/components/admin/AdminShell";
import QuoteListManager from "@/components/admin/quotes/QuoteListManager";

export default function QuotesListPage() {
  return (
    <AdminShell title="Danh sách báo giá">
      <QuoteListManager />
    </AdminShell>
  );
}
