"use client";

const TABS = [
  { id: "mp-pdp-specs", label: "Thông số" },
  { id: "mp-pdp-desc", label: "Mô tả" },
  { id: "mp-pdp-options", label: "Lựa chọn sản phẩm" },
  { id: "mp-pdp-faq", label: "FAQ" },
  { id: "mp-pdp-related", label: "Sản phẩm liên quan" },
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
