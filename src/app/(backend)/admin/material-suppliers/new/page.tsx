import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import MaterialSupplierForm from "@/components/admin/materials/MaterialSupplierForm";

export default function AdminMaterialSupplierNewPage() {
  return (
    <>
      <AdminPageTitle title="Thêm nhà cung cấp NPL" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang chuẩn bị form nhà cung cấp…" />}>
        <MaterialSupplierForm mode="create" />
      </Suspense>
    </>
  );
}
