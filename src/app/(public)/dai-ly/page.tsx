import type { Metadata } from "next";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import { canonicalUrl } from "@/lib/seo";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";

export async function generateMetadata(): Promise<Metadata> {
  const landing = await resolveBespokeLanding("dai-ly");
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: canonicalUrl("/dai-ly") },
  };
}

const BENEFITS = [
  {
    title: "Giá sỉ tận kho",
    description: "Chính sách giá theo cấp độ đại lý. Giá đại lý và giá VIP dành riêng cho đối tác.",
  },
  {
    title: "Nguồn hàng ổn định",
    description: "Hàng có sẵn tại kho, nhiều màu sắc và size. Cập nhật mẫu mới thường xuyên.",
  },
  {
    title: "Giao hàng toàn quốc",
    description: "Đóng gói và giao hàng nhanh trên toàn quốc. Hỗ trợ xử lý đơn hàng lớn.",
  },
  {
    title: "Hỗ trợ OEM",
    description: "Sản xuất Private Label theo thiết kế riêng. Phù hợp cho xưởng in và doanh nghiệp.",
  },
];

export default async function DaiLyPage() {
  const landing = await resolveBespokeLanding("dai-ly");

  return (
    <main>
      <section className="section">
        <div className="container">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "64px", alignItems: "start" }}
          >
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
                Chương trình đại lý
              </div>

              <h1
                style={{
                  fontSize: "40px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  margin: "0 0 16px",
                }}
              >
                {landing.heroTitle}
              </h1>

              <p
                style={{
                  fontSize: "17px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  margin: "0 0 40px",
                }}
              >
                {landing.heroDescription}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="card" style={{ padding: "20px" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600 }}>
                      {benefit.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: 1.6 }}>
                      {benefit.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <DealerLeadForm
                source="DEALER_FORM"
                title="Đăng ký đại lý"
                submitLabel="Gửi đăng ký"
              />
            </div>
          </div>
        </div>
      </section>

      {landing.seoContent && (
        <section className="section" style={{ borderTop: "1px solid #e5e7eb" }}>
          <div
            className="container"
            style={{ maxWidth: "860px" }}
            dangerouslySetInnerHTML={{ __html: landing.seoContent }}
          />
        </section>
      )}
    </main>
  );
}
