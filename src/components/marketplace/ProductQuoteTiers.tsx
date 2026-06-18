const QUOTE_TIERS = [
  "50+ sản phẩm",
  "100+ sản phẩm",
  "500+ sản phẩm",
  "1.000+ sản phẩm",
];

export default function ProductQuoteTiers() {
  return (
    <div className="mp-pdp-quote-block">
      <h2 className="mp-pdp-quote-title">Liên hệ báo giá sỉ</h2>
      <p className="mp-pdp-quote-copy">
        Giá thay đổi theo số lượng, tồn kho và yêu cầu in/thêu/OEM.
      </p>
      <div className="mp-pdp-quote-tiers">
        {QUOTE_TIERS.map((tier) => (
          <div key={tier} className="mp-pdp-quote-tier">
            <span className="mp-pdp-quote-tier-qty">{tier}</span>
            <span className="mp-pdp-quote-tier-note">Báo giá theo số lượng</span>
          </div>
        ))}
      </div>
    </div>
  );
}
