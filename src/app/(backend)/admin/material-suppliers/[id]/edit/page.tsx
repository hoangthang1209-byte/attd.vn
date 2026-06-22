import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialSupplierForm from "@/components/admin/materials/MaterialSupplierForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMaterialSupplierEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Sửa nhà cung cấp NPL" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialSupplierForm mode="edit" supplierId={id} />
      </Suspense>
    </>
  );
}
