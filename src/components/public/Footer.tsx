import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div>
            <p className="site-footer-brand">ATTD.VN</p>
            <p className="site-footer-text">
              Kho sỉ đồng phục và quà tặng doanh nghiệp — nguồn hàng B2B cho
              đại lý, xưởng in và doanh nghiệp trên toàn quốc.
            </p>
          </div>

          <div>
            <p className="site-footer-heading">Danh mục</p>
            <div className="site-footer-links">
              <Link href="/ao-thun-tron" className="site-footer-link">
                Áo thun trơn
              </Link>
              <Link href="/ao-polo-tron" className="site-footer-link">
                Áo polo trơn
              </Link>
              <Link href="/non" className="site-footer-link">
                Nón
              </Link>
              <Link href="/tote" className="site-footer-link">
                Tote
              </Link>
            </div>
          </div>

          <div>
            <p className="site-footer-heading">Hỗ trợ</p>
            <div className="site-footer-links">
              <Link href="/dai-ly" className="site-footer-link">
                Đăng ký đại lý
              </Link>
              <Link href="/lien-he" className="site-footer-link">
                Liên hệ
              </Link>
              <Link href="/oem" className="site-footer-link">
                OEM
              </Link>
              <Link href="/nguon-hang" className="site-footer-link">
                Nguồn hàng
              </Link>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          © {new Date().getFullYear()} ATTD.VN — B2B Sourcing Platform
        </div>
      </div>
    </footer>
  );
}
