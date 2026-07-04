import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ManufacturingAssetEditor from "@/components/admin/manufacturing-library/ManufacturingAssetEditor";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { listManufacturingLookupsAdmin } from "@/features/manufacturing-library/manufacturing-admin.service";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function NewManufacturingAssetPage() {
  await requireAdminPermissionPage("manufacturingAsset.create");
  const lookups = await listManufacturingLookupsAdmin();

  return (
    <>
      <AdminPageTitle title="Tạo tài sản sản xuất" />
      <ManufacturingAssetEditor lookups={serializable(lookups)} />
    </>
  );
}
