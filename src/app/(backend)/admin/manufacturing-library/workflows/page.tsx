import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ManufacturingWorkflowManager from "@/components/admin/manufacturing-library/ManufacturingWorkflowManager";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";
import { listManufacturingAssetsAdmin } from "@/features/manufacturing-library/manufacturing-admin.service";
import { prisma } from "@/lib/prisma";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function ManufacturingWorkflowsPage() {
  await requireAdminPermissionPage("manufacturingWorkflow.manage");
  const [workflows, assets] = await Promise.all([
    prisma.manufacturingWorkflowTemplate.findMany({
      include: {
        steps: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        _count: { select: { assets: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    listManufacturingAssetsAdmin({ pageSize: 100 }),
  ]);

  return (
    <>
      <AdminPageTitle title="Quy trình sản xuất" />
      <ManufacturingWorkflowManager
        workflows={serializable(workflows)}
        assets={serializable(assets.assets)}
      />
    </>
  );
}
