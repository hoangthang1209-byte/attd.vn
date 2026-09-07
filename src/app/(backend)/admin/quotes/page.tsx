import AdminPageTitle from "@/components/admin/AdminPageTitle";
import QuoteListManager from "@/components/admin/quotes/QuoteListManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Báo giá");

export default function QuotesListPage() {
  return (
    <>
      <AdminPageTitle title={"Danh sách báo giá"} />
      <QuoteListManager />
    </>
  );
}
