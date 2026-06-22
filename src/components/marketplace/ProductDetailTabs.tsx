"use client";

type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
};

export default function ProductDetailTabs({ tabs }: Props) {
  if (!tabs.length) return null;

  return (
    <nav className="mp-pdp-tabs" aria-label="Mục chi tiết sản phẩm">
      <div className="container">
        <div className="mp-pdp-tabs-scroll">
          {tabs.map((tab) => (
            <a key={tab.id} href={`#${tab.id}`} className="mp-pdp-tab">
              {tab.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
