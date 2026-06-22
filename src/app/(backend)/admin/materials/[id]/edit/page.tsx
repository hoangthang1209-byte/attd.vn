import { Suspense } from "react";
import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialForm from "@/components/admin/materials/MaterialForm";
import { getMaterial } from "@/features/materials/material.service";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMaterialEditPage({ params }: Props) {
  const { id } = await params;
  const material = await getMaterial(id);
  if (!material) notFound();

  return (
    <>
      <AdminPageTitle title={`Sửa vật tư · ${material.materialCode}`} />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialForm
          materialId={material.id}
          initial={{
            name: material.name,
            materialType: material.materialType,
            unit: material.unit,
            description: material.description,
            specification: material.specification,
            defaultSupplierName: material.defaultSupplierName,
            reorderPoint: material.reorderPoint?.toFixed() ?? null,
            isActive: material.isActive,
          }}
        />
      </Suspense>
    </>
  );
}
