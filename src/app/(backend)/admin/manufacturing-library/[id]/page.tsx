import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ManufacturingAssetEditor from "@/components/admin/manufacturing-library/ManufacturingAssetEditor";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import {
  getManufacturingAssetAdmin,
  listManufacturingLookupsAdmin,
} from "@/features/manufacturing-library/manufacturing-admin.service";

type PageProps = {
  params: Promise<{ id: string }>;
};

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function EditManufacturingAssetPage({ params }: PageProps) {
  await requireAdminPermissionPage("manufacturingAsset.update");
  const { id } = await params;
  const [asset, lookups] = await Promise.all([
    getManufacturingAssetAdmin(id),
    listManufacturingLookupsAdmin(),
  ]);
  if (!asset) notFound();

  return (
    <>
      <AdminPageTitle title="Sửa tài sản sản xuất" />
      <ManufacturingAssetEditor asset={serializable(asset)} lookups={serializable(lookups)} />
    </>
  );
}
