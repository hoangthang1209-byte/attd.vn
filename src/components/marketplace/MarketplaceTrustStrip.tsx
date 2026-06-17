const TRUST_ITEMS = [
  "Số lượng tối thiểu rõ ràng",
  "Hỗ trợ in/thêu/OEM",
  "Danh mục B2B đa dạng",
  "Giao hàng toàn quốc",
];

export default function MarketplaceTrustStrip() {
  return (
    <ul className="mp-trust-strip" aria-label="Cam kết nguồn hàng B2B">
      {TRUST_ITEMS.map((item) => (
        <li key={item} className="mp-trust-chip">
          {item}
        </li>
      ))}
    </ul>
  );
}
