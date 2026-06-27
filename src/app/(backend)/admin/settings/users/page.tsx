import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminUsersManager from "@/components/admin/settings/AdminUsersManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";

export default async function AdminUsersPage() {
  await requireAdminPermissionPage("users.manage", "/admin/dashboard");
  return (
    <>
      <AdminPageTitle title="Tài khoản đăng nhập" />
      <AdminUsersManager />
    </>
  );
}
