import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialsList from "@/components/admin/materials/MaterialsList";

export default function AdminMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Danh mục vật tư" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialsList />
      </Suspense>
    </>
  );
}
