import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalEmptyState from "@/components/portal/PortalEmptyState";

export default function PortalCatalogPage() {
  return (
    <PortalBusinessGuard>
      <div className="portal-page">
        <p className="portal-eyebrow">Catalog</p>
        <h1 className="portal-title">Catalog B2B</h1>
        <p className="portal-lead">
          Danh mục sản phẩm B2B theo dạng bảng — tối ưu cho mua sỉ và báo giá, không phải cửa hàng
          B2C.
        </p>
        <div className="portal-card" style={{ overflowX: "auto" }}>
          <table className="portal-table-preview">
            <thead>
              <tr>
                <th>SKU</th>
                <th>MOQ</th>
                <th>Lead time</th>
                <th>Tier price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ color: "#a3a3a3", textAlign: "center", padding: 24 }}>
                  Dữ liệu catalog sẽ hiển thị tại đây
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="portal-section">
          <PortalEmptyState
            title="Catalog đang được chuẩn bị"
            description="Bạn sẽ xem SKU, MOQ, lead time và giá tier theo nhóm giá B2B của mình."
          />
        </section>
      </div>
    </PortalBusinessGuard>
  );
}
