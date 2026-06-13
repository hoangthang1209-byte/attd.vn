import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/features/categories/services/category.service";
import { SITE_NAME, canonicalUrl, buildOgImages } from "@/lib/seo";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";
import { getZaloUrl } from "@/lib/companyInfo";

export const metadata: Metadata = {
  title: `Nguồn hàng sỉ | ${SITE_NAME}`,
  description:
    "Kho nguồn hàng sỉ đồng phục trơn cho đại lý và xưởng in toàn quốc. Áo thun, polo, tote bag, nón — hàng có sẵn, giá sỉ tận kho, giao nhanh.",
  alternates: { canonical: canonicalUrl("/nguon-hang") },
  openGraph: {
    title: `Nguồn hàng sỉ | ${SITE_NAME}`,
    description:
      "Kho sỉ đồng phục trơn B2B — hàng có sẵn, nhiều màu, nhiều size, giá sỉ tận kho.",
    images: buildOgImages(),
  },
};

const whyItems = [
  {
    icon: "📦",
    title: "Kho hàng có sẵn",
    body: "Hàng luôn sẵn kho, không cần chờ sản xuất. Đặt hàng và nhận ngay trong 2–5 ngày.",
  },
  {
    icon: "🎨",
    title: "Nhiều màu — nhiều size",
    body: "Bảng màu phong phú, đủ size từ XS đến 4XL. Phù hợp nhiều nhu cầu khách hàng.",
  },
  {
    icon: "💰",
    title: "Giá sỉ tận kho",
    body: "Giá cạnh tranh dành cho đại lý và xưởng in. Chính sách chiết khấu theo số lượng.",
  },
  {
    icon: "🚚",
    title: "Giao hàng toàn quốc",
    body: "Hợp tác với đơn vị vận chuyển uy tín, giao nhanh đến 63 tỉnh thành.",
  },
  {
    icon: "✅",
    title: "Chất lượng ổn định",
    body: "Sản phẩm kiểm tra chất lượng trước khi xuất kho. Đổi trả nếu có lỗi từ nhà sản xuất.",
  },
  {
    icon: "🤝",
    title: "Hỗ trợ tư vấn",
    body: "Đội ngũ ATTD hỗ trợ chọn hàng, tư vấn số lượng phù hợp và xử lý đơn hàng nhanh chóng.",
  },
];

const dealerBenefits = [
  "Giá đại lý tốt hơn giá lẻ",
  "Cập nhật nguồn hàng mới ưu tiên",
  "Hỗ trợ chính sách đổi trả",
  "Tư vấn chọn hàng tận tình",
  "Không yêu cầu ký quỹ",
  "Đặt hàng dễ dàng qua Zalo",
];

export default async function WholesalePage() {
  const categories = await getCategories();

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
            B2B Wholesale
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
            Nguồn hàng sỉ đồng phục trơn cho đại lý và xưởng in
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
            ATTD là kho sỉ B2B chuyên cung cấp áo thun, polo, tote bag và nón trơn chất lượng cao. Hàng sẵn kho, giao nhanh toàn quốc.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <TrackedLink
              href="/dai-ly"
              trackEvent="dealer_registration_click"
              trackSource="WHOLESALE_PAGE"
              className="btn-primary"
            >
              Đăng ký đại lý
            </TrackedLink>
            <TrackedLink
              href={getZaloUrl()}
              trackEvent="contact_zalo"
              trackSource="WHOLESALE_PAGE"
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

      {/* Why ATTD */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Tại sao chọn ATTD?</h2>
          <p className="section-description">
            Hơn 1.000 SKU nguồn hàng trơn, hàng có sẵn kho, giao nhanh toàn quốc.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "32px",
            }}
          >
            {whyItems.map((item) => (
              <div key={item.title} className="card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Danh mục sản phẩm</h2>
          <p className="section-description">
            Nhấn vào danh mục để xem chi tiết sản phẩm và bảng màu có sẵn.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
              marginTop: "28px",
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                className="card"
                style={{
                  textDecoration: "none",
                  color: "#111827",
                  fontWeight: 600,
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dealer benefits */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Quyền lợi đại lý ATTD</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "28px",
            }}
          >
            {dealerBenefits.map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#fff",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#111827",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#111827",
                  }}
                >
                  {b}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logistics */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Vận chuyển & Logistics</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {[
              { label: "Giao toàn quốc", detail: "63 tỉnh thành, hợp tác đơn vị vận chuyển uy tín" },
              { label: "2–5 ngày làm việc", detail: "Thời gian giao hàng tiêu chuẩn với hàng có sẵn kho" },
              { label: "Đóng gói cẩn thận", detail: "Hàng được đóng gói kỹ trước khi giao, hạn chế móp méo" },
              { label: "Theo dõi đơn hàng", detail: "Cung cấp mã vận đơn sau khi xuất kho" },
            ].map((l) => (
              <div key={l.label} className="card">
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {l.label}
                </div>
                <div
                  style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}
                >
                  {l.detail}
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
                Sẵn sàng lấy hàng sỉ?
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  marginBottom: "28px",
                }}
              >
                Điền form để nhận báo giá sỉ theo số lượng. Đội ngũ ATTD phản hồi trong 24 giờ làm việc.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Link href="/chinh-sach-dai-ly" className="btn-secondary">
                  Xem chính sách đại lý
                </Link>
              </div>
            </div>

            {/* Right: form */}
            <DealerLeadForm source="WHOLESALE_PAGE" title="Nhận báo giá sỉ" />
          </div>
        </div>
      </section>
    </main>
  );
}
