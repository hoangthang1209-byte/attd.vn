import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";
import Link from "next/link";

export default function ProductionTrimsPage() {
  return (
    <>
      <AdminPageTitle title="Phụ liệu" />
      <p className="admin-field-hint" style={{ margin: "0 0 12px" }}>
        Phụ liệu cũng nằm trong{" "}
        <Link href="/admin/production-materials" className="admin-link">
          Thư viện nguyên phụ liệu
        </Link>
        .
      </p>
      <ProductionMasterListClient kind="trim" />
    </>
  );
}
