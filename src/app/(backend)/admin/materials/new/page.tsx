import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import MaterialForm from "@/components/admin/materials/MaterialForm";

export default function AdminMaterialNewPage() {
  return (
    <>
      <AdminPageTitle title="Thêm vật tư" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang chuẩn bị form vật tư…" />}>
        <MaterialForm />
      </Suspense>
    </>
  );
}
