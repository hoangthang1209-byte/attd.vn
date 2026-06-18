"use client";

const TABS = [
  { id: "mp-pdp-info", label: "Thông tin sản phẩm" },
  { id: "mp-pdp-options", label: "Lựa chọn" },
  { id: "mp-pdp-desc", label: "Mô tả" },
  { id: "mp-pdp-faq", label: "FAQ" },
  { id: "mp-pdp-related", label: "Nguồn hàng liên quan" },
];

export default function ProductDetailTabs() {
  return (
    <nav className="mp-pdp-tabs" aria-label="Mục chi tiết sản phẩm">
      <div className="container">
        <div className="mp-pdp-tabs-scroll">
          {TABS.map((tab) => (
            <a key={tab.id} href={`#${tab.id}`} className="mp-pdp-tab">
              {tab.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
