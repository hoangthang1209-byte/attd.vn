export default function MarketplaceRFQStrip() {
  return (
    <section className="mp-rfq" aria-labelledby="mp-rfq-title">
      <div className="container">
        <div className="mp-rfq-inner">
          <div className="mp-rfq-copy">
            <p className="mp-rfq-eyebrow">Yêu cầu báo giá nhanh</p>
            <h2 id="mp-rfq-title" className="mp-rfq-title">
              Gửi nhu cầu, ATTD gợi ý phương án phù hợp
            </h2>
            <p className="mp-rfq-desc">
              Cho ATTD biết sản phẩm, số lượng và yêu cầu hoàn thiện. Đội ngũ sẽ tư vấn
              nguồn hàng, MOQ và hướng triển khai trước khi báo giá.
            </p>
            <ul className="mp-rfq-proof" aria-label="Thông tin ATTD sẽ tư vấn">
              <li>Kiểm tra nguồn hàng / khả năng sản xuất</li>
              <li>MOQ và tiến độ dự kiến</li>
              <li>Phương án in, thêu hoặc OEM khi cần</li>
            </ul>
          </div>

          <form className="mp-rfq-form" action="/lien-he" method="get">
            <div className="mp-rfq-fields">
              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Bạn cần gì?</span>
                <select name="product_group" className="mp-rfq-input" defaultValue="">
                  <option value="" disabled>Chọn nhóm sản phẩm</option>
                  <option value="Áo thun">Áo thun</option>
                  <option value="Áo polo">Áo polo</option>
                  <option value="Nón">Nón</option>
                  <option value="Túi">Túi</option>
                  <option value="Quà tặng doanh nghiệp">Quà tặng doanh nghiệp</option>
                  <option value="Khác">Khác</option>
                </select>
              </label>

              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Số lượng dự kiến</span>
                <select name="quantity" className="mp-rfq-input" defaultValue="">
                  <option value="" disabled>Chọn số lượng</option>
                  <option value="Dưới 50">Dưới 50</option>
                  <option value="50-100">50–100</option>
                  <option value="100-500">100–500</option>
                  <option value="500-1000">500–1.000</option>
                  <option value="Trên 1000">Trên 1.000</option>
                </select>
              </label>

              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Nhu cầu hoàn thiện</span>
                <select name="service" className="mp-rfq-input" defaultValue="">
                  <option value="" disabled>Chọn nhu cầu</option>
                  <option value="Hàng trơn">Hàng trơn</option>
                  <option value="In logo">In logo</option>
                  <option value="Thêu logo">Thêu logo</option>
                  <option value="OEM / Private Label">OEM / Private Label</option>
                  <option value="Cần tư vấn">Cần tư vấn</option>
                </select>
              </label>

              <label className="mp-rfq-field">
                <span className="mp-rfq-label">Thời gian cần hàng</span>
                <select name="timeline" className="mp-rfq-input" defaultValue="">
                  <option value="" disabled>Chọn thời gian</option>
                  <option value="Dưới 7 ngày">Dưới 7 ngày</option>
                  <option value="7-14 ngày">7–14 ngày</option>
                  <option value="14-30 ngày">14–30 ngày</option>
                  <option value="Trên 30 ngày">Trên 30 ngày</option>
                  <option value="Chưa xác định">Chưa xác định</option>
                </select>
              </label>
            </div>

            <button type="submit" className="btn-primary mp-rfq-submit">
              Tiếp tục nhận báo giá
            </button>
            <p className="mp-rfq-note">Không cần chuẩn bị brief hoàn chỉnh — ATTD sẽ hỏi tiếp các thông tin còn thiếu.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
