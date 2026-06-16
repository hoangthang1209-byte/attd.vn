import type { Metadata } from "next";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import LandingHeroVisual from "@/components/public/LandingHeroVisual";
import { canonicalUrl } from "@/lib/seo";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { getLandingDemoImage } from "@/features/demo/demo-image-map";

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
      <LandingHeroVisual
        eyebrow="Chương trình đại lý"
        title={landing.heroTitle}
        description={landing.heroDescription}
        imageUrl={getLandingDemoImage("dai-ly")}
        dark={false}
        primaryCta={{ href: "/lien-he", label: "Liên hệ báo giá" }}
        secondaryCta={{ href: "#dealer-form", label: "Đăng ký đại lý" }}
      />

      <section className="section landing-benefits-section">
        <div className="container">
          <div className="landing-benefits-grid">
            <div>
              <h2 className="section-title" style={{ marginBottom: 24 }}>
                Quyền lợi đại lý ATTD
              </h2>
              <div className="landing-benefits-cards">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="card landing-benefit-card">
                    <h3 className="landing-benefit-title">{benefit.title}</h3>
                    <p className="landing-benefit-desc">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="dealer-form">
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
