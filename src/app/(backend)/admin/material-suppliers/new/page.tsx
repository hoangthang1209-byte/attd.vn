import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialSupplierForm from "@/components/admin/materials/MaterialSupplierForm";

export default function AdminMaterialSupplierNewPage() {
  return (
    <>
      <AdminPageTitle title="Thêm nhà cung cấp NPL" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialSupplierForm mode="create" />
      </Suspense>
    </>
  );
}
