import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/public/ContactForm";
import { buildContactMetadata } from "@/lib/seo/indexation-policy";

export const metadata: Metadata = buildContactMetadata({
  title: "Liên hệ báo giá | ATTD",
  description:
    "Gửi yêu cầu báo giá nguồn hàng đồng phục và quà tặng doanh nghiệp. ATTD phản hồi trong 24 giờ làm việc.",
});

const CONTEXT_CARDS = [
  {
    title: "Báo giá nguồn hàng",
    description:
      "Áo thun, polo, nón, tote và quà tặng doanh nghiệp. Giá sỉ theo số lượng, giao hàng toàn quốc.",
  },
  {
    title: "Yêu cầu OEM",
    description:
      "Sản xuất Private Label theo thiết kế riêng. Phù hợp cho xưởng in và thương hiệu.",
  },
  {
    title: "Hỗ trợ doanh nghiệp",
    description:
      "Đồng phục và quà tặng doanh nghiệp theo số lượng. Tư vấn mẫu và chất liệu phù hợp.",
  },
];

export default function LienHePage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "64px", alignItems: "start" }}
          >
            {/* Left: Context */}
            <div>
              <div
                style={{
                  display: "inline-block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--primary)",
                  background: "#fff0f0",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  marginBottom: "16px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Liên hệ B2B
              </div>

              <h1
                style={{
                  fontSize: "40px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  margin: "0 0 16px",
                }}
              >
                Liên hệ báo giá
              </h1>

              <p
                style={{
                  fontSize: "17px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  margin: "0 0 32px",
                }}
              >
                Dành cho đại lý, xưởng in, doanh nghiệp cần nguồn hàng đồng
                phục và quà tặng số lượng lớn. Chúng tôi sẽ phản hồi trong
                vòng 24 giờ làm việc.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "32px",
                }}
              >
                {CONTEXT_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="card"
                    style={{ padding: "20px" }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                        fontWeight: 600,
                      }}
                    >
                      {card.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#6b7280",
                        lineHeight: 1.6,
                      }}
                    >
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Muốn trở thành đại lý chính thức?{" "}
                <Link
                  href="/dai-ly"
                  style={{
                    color: "var(--primary)",
                    fontWeight: 500,
                  }}
                >
                  Đăng ký đại lý →
                </Link>
              </p>
            </div>

            {/* Right: Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
