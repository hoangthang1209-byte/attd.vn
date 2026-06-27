import { requireFinancialAdminPage } from "@/lib/admin-auth/require-financial-admin";

export default async function QuotesLayout({ children }: { children: React.ReactNode }) {
  await requireFinancialAdminPage("/admin/quotes");
  return children;
}
