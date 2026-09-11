import BankTransactionManager from "@/components/admin/banking/BankTransactionManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Giao dịch ngân hàng");

export default function BankTransactionsPage() {
  return <BankTransactionManager />;
}
