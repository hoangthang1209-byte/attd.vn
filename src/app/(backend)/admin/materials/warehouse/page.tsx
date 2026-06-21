import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialsWarehouseManager from "@/components/admin/materials/MaterialsWarehouseManager";

export default function AdminMaterialsWarehousePage() {
  return (
    <>
      <AdminPageTitle title="Tồn kho vật tư" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialsWarehouseManager />
      </Suspense>
    </>
  );
}
