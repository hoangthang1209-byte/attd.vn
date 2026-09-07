import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminRolesManager from "@/components/admin/settings/AdminRolesManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Vai trò & quyền");

export default async function AdminRolesPage() {
  await requireAdminPermissionPage("roles_permissions.manage", "/admin/dashboard");
  return (
    <>
      <AdminPageTitle title="Vai trò & phân quyền" />
      <AdminRolesManager />
    </>
  );
}
