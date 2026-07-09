import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import MaterialsList from "@/components/admin/materials/MaterialsList";

export default function AdminMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Danh mục vật tư" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang tải danh sách vật tư…" />}>
        <MaterialsList />
      </Suspense>
    </>
  );
}
