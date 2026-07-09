import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import MaterialSuppliersList from "@/components/admin/materials/MaterialSuppliersList";

export default function AdminMaterialSuppliersPage() {
  return (
    <>
      <AdminPageTitle title="Nhà cung cấp nguyên phụ liệu" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang tải nhà cung cấp vật tư…" />}>
        <MaterialSuppliersList />
      </Suspense>
    </>
  );
}
