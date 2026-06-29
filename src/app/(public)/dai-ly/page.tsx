import type { Metadata } from "next";
import Link from "next/link";
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

const AUDIENCES = [
  {
    title: "Đại lý đồng phục",
    description: "Cần nguồn hàng ổn định, dễ báo giá và phù hợp nhiều nhóm khách doanh nghiệp.",
  },
  {
    title: "Agency / event company",
    description: "Tìm sản phẩm trơn, quà tặng và giải pháp sourcing cho chiến dịch, sự kiện.",
  },
  {
    title: "Xưởng in / thêu",
    description: "Cần phôi áo, nón, túi tote và sản phẩm quà tặng để hoàn thiện đơn hàng.",
  },
  {
    title: "Công ty quà tặng",
    description: "Muốn gom nguồn sản phẩm B2B, đóng gói theo dự án và báo giá theo số lượng.",
  },
  {
    title: "Doanh nghiệp mua định kỳ",
    description: "Thường xuyên đặt đồng phục, onboarding kit hoặc quà tặng cho nhân sự, đối tác.",
  },
];

const BENEFITS = [
  {
    title: "Giá sỉ theo nhóm đại lý",
    description: "Chính sách giá được tư vấn theo mô hình kinh doanh và nhu cầu đặt hàng.",
  },
  {
    title: "Danh mục sản phẩm B2B",
    description: "Tập trung vào đồng phục, phôi trơn, quà tặng doanh nghiệp và OEM/private label.",
  },
  {
    title: "Hỗ trợ báo giá nhanh",
    description: "ATTD hỗ trợ gom thông tin sản phẩm, số lượng và phương án thực hiện để phản hồi rõ ràng.",
  },
  {
    title: "Hỗ trợ in/thêu/OEM",
    description: "Tư vấn hướng triển khai phù hợp cho đơn đồng phục, quà tặng và nhãn riêng.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Gửi thông tin đăng ký",
    description: "Chia sẻ mô hình kinh doanh, nhóm sản phẩm quan tâm và khu vực phục vụ.",
  },
  {
    step: "02",
    title: "ATTD duyệt hồ sơ",
    description: "Đội ngũ ATTD trao đổi thêm để hiểu nhu cầu và đề xuất cách hợp tác phù hợp.",
  },
  {
    step: "03",
    title: "Mở quyền theo từng giai đoạn",
    description: "ATTD đang từng bước mở quyền truy cập catalogue và báo giá riêng cho đại lý.",
  },
  {
    step: "04",
    title: "Gửi yêu cầu báo giá",
    description: "Đại lý gửi sản phẩm, số lượng, logo hoặc yêu cầu OEM để nhận tư vấn nguồn hàng.",
  },
];

export default async function DaiLyPage() {
  const landing = await resolveBespokeLanding("dai-ly");

  return (
    <main className="dealer-landing-v2">
      <LandingHeroVisual
        eyebrow="Chương trình đại lý"
        title={landing.heroTitle}
        description={landing.heroDescription}
        imageUrl={getLandingDemoImage("dai-ly")}
        dark={false}
        primaryCta={{ href: "#dealer-form", label: "Đăng ký đại lý" }}
        secondaryCta={{ href: "/lien-he", label: "Trao đổi với ATTD" }}
      />

      <section className="section dealer-landing-section dealer-landing-section--intro">
        <div className="container">
          <div className="dealer-landing-section-header">
            <p className="dealer-landing-eyebrow">Dành cho đối tác B2B</p>
            <h2 className="section-title">Ai phù hợp với chương trình đại lý?</h2>
            <p className="section-description">
              ATTD phù hợp với đội ngũ cần nguồn hàng đồng phục, phôi trơn và quà tặng doanh nghiệp để phục vụ khách hàng B2B một cách ổn định.
            </p>
          </div>

          <div className="dealer-audience-grid">
            {AUDIENCES.map((audience) => (
              <article key={audience.title} className="card dealer-audience-card">
                <h3>{audience.title}</h3>
                <p>{audience.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt dealer-landing-section">
        <div className="container">
          <div className="dealer-landing-split">
            <div className="dealer-landing-copy">
              <p className="dealer-landing-eyebrow">Vì sao hợp tác với ATTD?</p>
              <h2 className="section-title">Nguồn hàng rõ ràng cho đội ngũ bán B2B</h2>
              <p className="section-description">
                Tập trung vào sản phẩm dễ triển khai cho đại lý, agency, xưởng in và doanh nghiệp đặt hàng định kỳ — không tạo cảm giác chợ sỉ rối mắt.
              </p>
            </div>

            <div className="dealer-benefit-list">
              {BENEFITS.map((benefit) => (
                <article key={benefit.title} className="dealer-benefit-item">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section dealer-landing-section">
        <div className="container">
          <div className="dealer-landing-section-header dealer-landing-section-header--center">
            <p className="dealer-landing-eyebrow">Quy trình hợp tác</p>
            <h2 className="section-title">Sau khi đăng ký, điều gì sẽ diễn ra?</h2>
            <p className="section-description">
              Quy trình được giữ gọn để ATTD hiểu đúng nhu cầu và mở quyền phù hợp theo từng giai đoạn.
            </p>
          </div>

          <div className="dealer-workflow-grid">
            {WORKFLOW.map((item) => (
              <article key={item.step} className="dealer-workflow-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="dealer-form" className="section dealer-landing-section dealer-landing-form-section">
        <div className="container">
          <div className="dealer-form-grid">
            <div className="dealer-final-panel">
              <p className="dealer-landing-eyebrow">Bắt đầu hợp tác</p>
              <h2>Đăng ký đại lý ATTD</h2>
              <p>
                Gửi thông tin để ATTD tư vấn cách lấy nguồn hàng phù hợp với mô hình kinh doanh của bạn.
              </p>
              <ul>
                <li>Không spam</li>
                <li>Tư vấn theo mô hình kinh doanh</li>
                <li>Phản hồi trong giờ làm việc</li>
              </ul>
              <Link href="/lien-he" className="btn-secondary">
                Trao đổi với ATTD
              </Link>
            </div>

            <DealerLeadForm
              source="DEALER_FORM"
              title="Thông tin đăng ký"
              submitLabel="Gửi đăng ký đại lý"
            />
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
