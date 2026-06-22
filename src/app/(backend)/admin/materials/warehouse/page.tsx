import { Suspense } from "react";
import AdminBackLink from "@/components/admin/AdminBackLink";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialsWarehouseManager from "@/components/admin/materials/MaterialsWarehouseManager";

export default function AdminMaterialsWarehousePage() {
  return (
    <>
      <AdminBackLink href="/admin/materials" label="Quay lại danh sách vật tư" />
      <AdminPageTitle title="Tồn kho vật tư" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialsWarehouseManager />
      </Suspense>
    </>
  );
}
