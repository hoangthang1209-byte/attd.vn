import Link from "next/link";

export default function FooterCtaBand() {
  return (
    <section className="footer-cta-band">
      <div className="container">
        <div className="footer-cta-inner">
          <div>
            <h2 className="footer-cta-title">
              Cần nguồn hàng đồng phục &amp; quà tặng?
            </h2>
            <p className="footer-cta-desc">
              Gửi yêu cầu để ATTD tư vấn MOQ, lead-time và báo giá sỉ theo số lượng.
            </p>
          </div>
          <div className="footer-cta-btns">
            <Link href="/lien-he" className="btn-primary">
              Liên hệ báo giá
            </Link>
            <Link href="/dai-ly" className="btn-secondary footer-cta-btn-secondary">
              Đăng ký đại lý
            </Link>
          </div>
        </div>
        <div className="footer-trust-chips">
          {["MOQ rõ ràng", "Hỗ trợ in/thêu/OEM", "Giao hàng toàn quốc", "B2B wholesale"].map(
            (chip) => (
              <span key={chip} className="footer-trust-chip">
                {chip}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
