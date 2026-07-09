import { Suspense } from "react";
import AdminBackLink from "@/components/admin/AdminBackLink";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import MaterialsWarehouseManager from "@/components/admin/materials/MaterialsWarehouseManager";

export default function AdminMaterialsWarehousePage() {
  return (
    <>
      <AdminBackLink href="/admin/materials" label="Quay lại danh sách vật tư" />
      <AdminPageTitle title="Tồn kho vật tư" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang tải tồn kho vật tư…" />}>
        <MaterialsWarehouseManager />
      </Suspense>
    </>
  );
}
