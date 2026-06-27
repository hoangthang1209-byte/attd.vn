import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminRolesManager from "@/components/admin/settings/AdminRolesManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";

export default async function AdminRolesPage() {
  await requireAdminPermissionPage("roles_permissions.manage", "/admin/dashboard");
  return (
    <>
      <AdminPageTitle title="Vai trò & phân quyền" />
      <AdminRolesManager />
    </>
  );
}
