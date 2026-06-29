const CATALOG_SOURCING_BADGES = [
  "Báo giá theo số lượng",
  "Hỗ trợ in/thêu/OEM",
];

export default function CatalogSourcingBadges() {
  return (
    <div className="mp-catalog-sourcing-badges" aria-label="Lợi ích nguồn hàng B2B">
      {CATALOG_SOURCING_BADGES.map((badge) => (
        <span key={badge} className="mp-catalog-sourcing-badge">
          {badge}
        </span>
      ))}
    </div>
  );
}
