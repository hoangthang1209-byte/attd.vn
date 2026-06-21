import AdminPageTitle from "@/components/admin/AdminPageTitle";
import QuoteListManager from "@/components/admin/quotes/QuoteListManager";

export default function QuotesListPage() {
  return (
    <>
      <AdminPageTitle title={"Danh sách báo giá"} />
      <QuoteListManager />
    </>
  );
}
