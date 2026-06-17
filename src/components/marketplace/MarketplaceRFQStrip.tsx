import Link from "next/link";

export default function MarketplaceRFQStrip() {
  return (
    <section className="mp-rfq">
      <div className="container">
        <div className="mp-rfq-inner">
          <div className="mp-rfq-copy">
            <h2 className="mp-rfq-title">Không thấy sản phẩm phù hợp?</h2>
            <p className="mp-rfq-desc">
              Gửi yêu cầu nguồn hàng, ATTD sẽ tư vấn danh mục phù hợp, số lượng
              tối thiểu, thời gian giao/sản xuất và báo giá sỉ.
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
            <Link href="/lien-he" className="btn-primary mp-rfq-submit">
              Gửi yêu cầu báo giá
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}
