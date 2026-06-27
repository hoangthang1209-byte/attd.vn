import { requireFinancialAdminPage } from "@/lib/admin-auth/require-financial-admin";

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  await requireFinancialAdminPage("/admin/pricing");
  return children;
}
