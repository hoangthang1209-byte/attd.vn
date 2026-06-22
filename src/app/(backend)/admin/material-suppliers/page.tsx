import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialSuppliersList from "@/components/admin/materials/MaterialSuppliersList";

export default function AdminMaterialSuppliersPage() {
  return (
    <>
      <AdminPageTitle title="Nhà cung cấp nguyên phụ liệu" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <MaterialSuppliersList />
      </Suspense>
    </>
  );
}
