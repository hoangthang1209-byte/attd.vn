import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, canonicalUrl, buildOgImages } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Chính sách đại lý | ${SITE_NAME}`,
  description:
    "Chính sách đại lý ATTD: giá sỉ theo cấp độ, hỗ trợ tư vấn, giao hàng toàn quốc. Đăng ký làm đại lý để nhận quyền lợi tốt nhất.",
  alternates: { canonical: canonicalUrl("/chinh-sach-dai-ly") },
  openGraph: {
    title: `Chính sách đại lý | ${SITE_NAME}`,
    description:
      "Trở thành đại lý ATTD — giá sỉ tận kho, hỗ trợ tư vấn, giao hàng nhanh toàn quốc.",
    images: buildOgImages(),
  },
};

const ZALO = "https://zalo.me/0934337667";

const benefits = [
  {
    icon: "💸",
    title: "Giá sỉ tận kho",
    body: "Đại lý được mua hàng với giá sỉ tốt hơn giá lẻ. Chiết khấu thêm theo số lượng mỗi đơn hàng.",
  },
  {
    icon: "🔔",
    title: "Cập nhật hàng mới ưu tiên",
    body: "Đại lý được thông báo trước khi có hàng mới, màu mới, hoặc sản phẩm mới về kho.",
  },
  {
    icon: "🎯",
    title: "Tư vấn chọn hàng tận tình",
    body: "Đội ngũ ATTD hỗ trợ đại lý chọn mẫu, chọn màu và số lượng phù hợp với thị trường.",
  },
  {
    icon: "🔄",
    title: "Chính sách đổi trả",
    body: "Hỗ trợ đổi trả nếu sản phẩm có lỗi từ nhà sản xuất. Xử lý nhanh chóng trong vòng 3–5 ngày.",
  },
  {
    icon: "🚚",
    title: "Giao hàng toàn quốc",
    body: "63 tỉnh thành, hợp tác đơn vị vận chuyển uy tín. Cung cấp mã vận đơn sau khi xuất kho.",
  },
  {
    icon: "📞",
    title: "Hỗ trợ trực tiếp qua Zalo",
    body: "Đặt hàng và trao đổi trực tiếp qua Zalo. Không cần tài khoản, không cần phần mềm quản lý.",
  },
];

const tiers = [
  {
    name: "Đại lý mới",
    desc: "Đơn hàng đầu tiên hoặc chưa đủ ngưỡng",
    price: "Giá đại lý tiêu chuẩn",
    badge: "",
  },
  {
    name: "Đại lý thường xuyên",
    desc: "Đặt hàng từ 2+ lần / tháng",
    price: "Chiết khấu thêm theo thoả thuận",
    badge: "Phổ biến",
  },
  {
    name: "Đại lý chiến lược",
    desc: "Đơn hàng lớn, hợp tác dài hạn",
    price: "Giá tốt nhất + ưu tiên xử lý đơn",
    badge: "Tốt nhất",
  },
];

const support = [
  "Tư vấn chọn hàng miễn phí trước khi đặt",
  "Cung cấp ảnh sản phẩm chất lượng cao",
  "Hỗ trợ bảng màu và thông số kỹ thuật",
  "Xử lý khiếu nại và hoàn hàng nhanh",
  "Thông báo hàng về kho và hàng sắp hết",
  "Đặt hàng nhanh qua Zalo không cần form",
];

export default function DealerPolicyPage() {
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
            Chính sách đại lý
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
            Trở thành đại lý ATTD — giá tốt, hỗ trợ đầy đủ
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
            ATTD là đối tác cung cấp nguồn hàng trơn B2B cho đại lý, xưởng in và doanh nghiệp trên toàn quốc. Chính sách giá minh bạch, hỗ trợ tận tình.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <Link href="/dai-ly" className="btn-primary">
              Đăng ký đại lý ngay
            </Link>
            <a
              href={ZALO}
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
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Quyền lợi đại lý ATTD</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "32px",
            }}
          >
            {benefits.map((b) => (
              <div key={b.title} className="card">
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>
                  {b.icon}
                </div>
                <h3
                  style={{
                    fontSize: "16px",
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

      {/* Pricing tiers */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Chính sách giá</h2>
          <p className="section-description">
            Giá sỉ theo cấp độ hợp tác. Liên hệ để biết thêm chi tiết.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "20px",
              marginTop: "28px",
            }}
          >
            {tiers.map((t) => (
              <div
                key={t.name}
                className="card"
                style={{
                  position: "relative",
                  border: t.badge === "Tốt nhất" ? "2px solid #111827" : undefined,
                }}
              >
                {t.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#111827",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 12px",
                      borderRadius: "20px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.badge}
                  </span>
                )}
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  {t.name}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginBottom: "16px",
                    lineHeight: 1.5,
                  }}
                >
                  {t.desc}
                </p>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    padding: "10px 0",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  {t.price}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              marginTop: "20px",
              fontSize: "13px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            Bảng giá chi tiết được cung cấp sau khi đăng ký đại lý.
          </p>
        </div>
      </section>

      {/* Support policy */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Chính sách hỗ trợ</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "28px",
            }}
          >
            {support.map((s) => (
              <div
                key={s}
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
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration CTA */}
      <section className="section">
        <div className="container">
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "48px 32px",
              background: "#111827",
              color: "#fff",
            }}
          >
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              Đăng ký làm đại lý ATTD
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#d1d5db",
                marginBottom: "28px",
                maxWidth: "480px",
                marginInline: "auto",
                lineHeight: 1.6,
              }}
            >
              Điền thông tin đăng ký — đội ngũ ATTD sẽ liên hệ và tư vấn trong vòng 24 giờ làm việc.
            </p>
            <div
              style={{
                display: "flex",
                gap: "14px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link href="/dai-ly" className="btn-primary">
                Đăng ký đại lý
              </Link>
              <Link
                href="/nguon-hang"
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
                Xem nguồn hàng
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
