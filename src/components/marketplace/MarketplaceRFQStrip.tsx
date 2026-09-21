export default function MarketplaceRFQStrip() {
  return (
    <section className="mp-rfq">
      <div className="container">
        <div className="mp-rfq-inner">
          <div className="mp-rfq-copy">
            <h2 className="mp-rfq-title">Gửi yêu cầu sourcing</h2>
            <p className="mp-rfq-desc">
              Mô tả nhu cầu để nhận tư vấn sản phẩm, MOQ, lead time và báo giá sơ bộ từ ATTD.
            </p>
          </div>

          <form className="mp-rfq-form" action="/lien-he" method="get">
            <div className="mp-rfq-fields">
              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Nhóm sản phẩm</span>
                <input
                  type="text"
                  name="product_group"
                  placeholder="VD: Áo thun trơn, tote bag…"
                  className="mp-rfq-input"
                />
              </label>
              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Số lượng dự kiến</span>
                <input
                  type="text"
                  name="quantity"
                  placeholder="VD: 500 cái"
                  className="mp-rfq-input"
                />
              </label>
              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Khu vực giao hàng</span>
                <input
                  type="text"
                  name="region"
                  placeholder="VD: TP.HCM, Hà Nội…"
                  className="mp-rfq-input"
                />
              </label>
            </div>
            <button type="submit" className="btn-primary mp-rfq-submit">
              Gửi yêu cầu báo giá
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
