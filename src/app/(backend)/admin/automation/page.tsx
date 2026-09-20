import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AutomationDashboardClient from "@/components/admin/automation/AutomationDashboardClient";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tự động hóa");

export default function AutomationAdminPage() {
  return (
    <>
      <AdminPageTitle title="Tự động hóa" />
      <AutomationDashboardClient />
    </>
  );
}
