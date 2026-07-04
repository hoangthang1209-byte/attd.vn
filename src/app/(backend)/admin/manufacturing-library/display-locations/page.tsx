import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ManufacturingDisplayLocationManager from "@/components/admin/manufacturing-library/ManufacturingDisplayLocationManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { prisma } from "@/lib/prisma";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function ManufacturingDisplayLocationsPage() {
  await requireAdminPermissionPage("manufacturingDisplayLocation.manage");
  const displayLocations = await prisma.manufacturingDisplayLocation.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <AdminPageTitle title="Vị trí hiển thị thư viện sản xuất" />
      <ManufacturingDisplayLocationManager displayLocations={serializable(displayLocations)} />
    </>
  );
}
