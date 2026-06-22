import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialForm from "@/components/admin/materials/MaterialForm";

export default function AdminMaterialNewPage() {
  return (
    <>
      <AdminPageTitle title="Thêm vật tư" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialForm />
      </Suspense>
    </>
  );
}
