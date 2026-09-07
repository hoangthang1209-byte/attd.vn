import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogDashboard from "@/components/admin/products/ProductCatalogDashboard";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";
import Link from "next/link";

export const metadata = adminPageMetadata("Sản phẩm");

export default function ProductsAdminPage() {
  return (
    <div className="product-admin-shell product-admin-list-page">
      <AdminPageTitle title={"Sản phẩm"} />
      <p className="admin-field-hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Cấu hình:{" "}
        <Link href="/admin/danh-muc">Danh mục</Link>
        {" · "}
        <Link href="/admin/variant">SKU &amp; Biến thể</Link>
        {" · "}
        <Link href="/admin/attributes">Thuộc tính</Link>
        {" · "}
        <Link href="/admin/pricing/product-tiers">Giá sản phẩm</Link>
      </p>
      <ProductCatalogDashboard />
    </div>
  );
}
