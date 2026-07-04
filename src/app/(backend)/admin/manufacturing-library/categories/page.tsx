import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ManufacturingCategoryManager from "@/components/admin/manufacturing-library/ManufacturingCategoryManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { prisma } from "@/lib/prisma";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function ManufacturingCategoriesPage() {
  await requireAdminPermissionPage("manufacturingCategory.manage");
  const categories = await prisma.manufacturingCategory.findMany({
    include: { parent: true, _count: { select: { assets: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <AdminPageTitle title="Danh mục thư viện sản xuất" />
      <ManufacturingCategoryManager categories={serializable(categories)} />
    </>
  );
}
