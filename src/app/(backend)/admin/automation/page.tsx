import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AutomationDashboardClient from "@/components/admin/automation/AutomationDashboardClient";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tự động hóa");

export default async function AutomationAdminPage() {
  await requireAdminPermissionPage("dashboard.view", "/admin/dashboard");

  return (
    <>
      <AdminPageTitle title="Tự động hóa" />
      <AutomationDashboardClient />
    </>
  );
}
