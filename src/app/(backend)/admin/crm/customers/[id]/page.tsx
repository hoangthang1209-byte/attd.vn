import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmCustomerDetailView from "@/components/admin/crm/CrmCustomerDetailView";
import { getCustomerById } from "@/features/crm/services/crm-customer.service";
import { getCustomerAccountOverview } from "@/features/crm/services/customer-account-overview.service";
import {
  can,
  canViewOrderFinancials,
} from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSessionFromCookies();

  const [customer, overview] = await Promise.all([
    getCustomerById(id),
    getCustomerAccountOverview(id, {
      includeQuotes: can(session, "quotes.view"),
      includeOrders: can(session, "orders.view"),
      includeFinancials: canViewOrderFinancials(session),
      includeProduction:
        can(session, "production.view") ||
        can(session, "manufacturing.production.view"),
      canCreateQuote: can(session, "quotes.create"),
    }),
  ]);

  if (!customer || !overview) {
    notFound();
  }

  return (
    <>
      <AdminPageTitle title="Khách hàng" />
      <CrmCustomerDetailView initialCustomer={customer} overview={overview} />
    </>
  );
}
