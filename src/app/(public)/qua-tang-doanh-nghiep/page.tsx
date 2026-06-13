import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, canonicalUrl, buildOgImages } from "@/lib/seo";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";
import { getZaloUrl } from "@/lib/companyInfo";

export const metadata: Metadata = {
  title: `Quà tặng doanh nghiệp | ${SITE_NAME}`,
  description:
    "Nguồn hàng quà tặng doanh nghiệp B2B: áo thun, polo, tote bag, nón và phụ kiện. Số lượng linh hoạt, giao nhanh toàn quốc, hỗ trợ gắn nhãn thương hiệu.",
  alternates: { canonical: canonicalUrl("/qua-tang-doanh-nghiep") },
  openGraph: {
    title: `Quà tặng doanh nghiệp | ${SITE_NAME}`,
    description:
      "Nguồn hàng quà tặng doanh nghiệp B2B — áo thun, tote bag, nón và phụ kiện. Hàng sẵn kho, giao nhanh.",
    images: buildOgImages(),
  },
};

const categories = [
  { name: "Áo thun trơn", detail: "Nhiều màu, nhiều size, chất liệu cotton cao cấp. Phù hợp làm đồng phục và quà tặng." },
  { name: "Polo trơn", detail: "Dáng cổ bẻ lịch sự, phù hợp sự kiện doanh nghiệp và đồng phục văn phòng." },
  { name: "Tote bag", detail: "Túi vải canvas bền chắc, dung tích lớn. Phổ biến cho quà tặng hội nghị." },
  { name: "Nón", detail: "Nón lưỡi trai và nón bucket đa dạng màu sắc, phù hợp sự kiện ngoài trời." },
];

const branding = [
  {
    title: "Gắn nhãn thương hiệu",
    body: "Hỗ trợ gắn woven label, cổ in, hang tag theo yêu cầu khi đặt số lượng đủ điều kiện.",
  },
  {
    title: "Đóng gói theo bộ",
    body: "Đóng gói quà tặng theo set (áo + túi + nón), poly bag hoặc hộp quà theo yêu cầu.",
  },
  {
    title: "Tư vấn phối bộ sản phẩm",
    body: "Đội ngũ ATTD hỗ trợ chọn sản phẩm và màu sắc phù hợp với bộ nhận diện thương hiệu.",
  },
  {
    title: "Nguồn hàng đồng nhất",
    body: "Cùng lô hàng, cùng chất liệu, cùng màu sắc — đảm bảo đồng nhất cho toàn bộ đơn hàng.",
  },
];

export default function CorporateGiftsPage() {
  return (
    <main>
      {/* Hero */}
      <section
        className="section"
        style={{ background: "#111827", color: "#fff" }}
      >
        <div className="container">
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#9ca3af",
              marginBottom: "16px",
              textTransform: "uppercase",
            }}
          >
            Corporate Gifts
          </p>

          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 20px",
              maxWidth: "700px",
            }}
          >
            Nguồn hàng quà tặng doanh nghiệp B2B
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#d1d5db",
              lineHeight: 1.7,
              maxWidth: "600px",
              margin: "0 0 36px",
            }}
          >
            ATTD cung cấp áo thun, polo, tote bag, nón và phụ kiện — hàng sẵn kho, hỗ trợ gắn nhãn thương hiệu và đóng gói theo yêu cầu doanh nghiệp.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <TrackedLink
              href="/lien-he"
              trackEvent="contact_quote"
              trackSource="CORPORATE_GIFTS_PAGE"
              className="btn-primary"
            >
              Nhận báo giá
            </TrackedLink>
            <TrackedLink
              href={getZaloUrl()}
              trackEvent="contact_zalo"
              trackSource="CORPORATE_GIFTS_PAGE"
              external
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 24px",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#fff",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Chat Zalo
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* Product categories */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Danh mục quà tặng phổ biến</h2>
          <p className="section-description">
            Tất cả sản phẩm đều có sẵn kho, đa dạng màu sắc và kích thước.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "32px",
            }}
          >
            {categories.map((c) => (
              <div key={c.name} className="card">
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  {c.name}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branding options */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Tùy chọn gắn thương hiệu</h2>
          <p className="section-description">
            ATTD là nhà cung cấp nguồn hàng — hỗ trợ gắn nhãn và đóng gói, không cung cấp dịch vụ in ấn trực tiếp.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {branding.map((b) => (
              <div key={b.title} className="card">
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOQ */}
      <section className="section">
        <div className="container" style={{ maxWidth: "680px" }}>
          <h2 className="section-title">Số lượng đặt hàng tối thiểu</h2>

          <div
            className="card"
            style={{
              marginTop: "28px",
              padding: "28px 32px",
              background: "#f9fafb",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                lineHeight: 1.8,
                color: "#374151",
                margin: 0,
              }}
            >
              MOQ linh hoạt theo từng sản phẩm và chương trình. ATTD phục vụ cả đơn hàng nhỏ lẻ từ doanh nghiệp lẫn đơn số lượng lớn từ nhà phân phối.
            </p>

            <ul
              style={{
                margin: "16px 0 0",
                padding: "0 0 0 20px",
                color: "#4b5563",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              <li>Đơn hàng nhỏ: lấy hàng theo giá niêm yết đại lý</li>
              <li>Đơn hàng lớn (100+ sản phẩm): chiết khấu theo số lượng</li>
              <li>Đơn hàng OEM / gắn nhãn riêng: liên hệ để tư vấn</li>
            </ul>

            <div style={{ marginTop: "20px" }}>
              <Link href="/lien-he" className="btn-primary">
                Liên hệ để biết giá
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Giao hàng & Thực hiện đơn hàng</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {[
              { label: "Toàn quốc", detail: "Giao hàng 63 tỉnh thành Việt Nam" },
              { label: "2–5 ngày", detail: "Thời gian giao hàng tiêu chuẩn với hàng có sẵn" },
              { label: "Đóng gói cẩn thận", detail: "Hàng được đóng gói kỹ, hạn chế hư hỏng" },
              { label: "Xuất kho nhanh", detail: "Xác nhận đơn và xuất kho trong 24h làm việc" },
            ].map((d) => (
              <div key={d.label} className="card" style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {d.label}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                  {d.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Form */}
      <section className="section" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "48px",
              alignItems: "start",
            }}
          >
            {/* Left: info */}
            <div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "16px",
                  lineHeight: 1.2,
                }}
              >
                Nhận báo giá quà tặng doanh nghiệp
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  marginBottom: "28px",
                }}
              >
                Điền thông tin để nhận báo giá và tư vấn nguồn hàng quà tặng phù hợp. Đội ngũ ATTD phản hồi trong 24 giờ làm việc.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <TrackedLink
                  href={getZaloUrl()}
                  trackEvent="contact_zalo"
                  trackSource="CORPORATE_GIFTS_PAGE"
                  external
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Chat Zalo ngay
                </TrackedLink>
              </div>
            </div>

            {/* Right: form */}
            <DealerLeadForm source="CORPORATE_GIFTS_PAGE" title="Nhận báo giá quà tặng" />
          </div>
        </div>
      </section>
    </main>
  );
}
