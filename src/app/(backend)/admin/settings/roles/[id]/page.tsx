import AdminRoleDetailManager from "@/components/admin/settings/AdminRoleDetailManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";

type Props = { params: Promise<{ id: string }> };

export default async function AdminRoleDetailPage({ params }: Props) {
  await requireAdminPermissionPage("roles_permissions.manage", "/admin/dashboard");
  const { id } = await params;
  return <AdminRoleDetailManager roleId={id} />;
}
