import type { Metadata } from "next";
import Link from "next/link";
import CompanyFacts from "@/components/public/company/CompanyFacts";
import CompanyIntroSection from "@/components/public/company/CompanyIntroSection";
import CompanyTimeline from "@/components/public/company/CompanyTimeline";
import WhyChooseAttd from "@/components/public/company/WhyChooseAttd";
import FactoryOverview from "@/components/public/company/FactoryOverview";
import CustomerLogoStrip from "@/components/public/company/CustomerLogoStrip";
import CompanyTrustMetrics from "@/components/public/company/CompanyTrustMetrics";
import TestimonialSection from "@/components/public/company/TestimonialSection";
import CaseStudySection from "@/components/public/CaseStudySection";
import CompanyContactCard from "@/components/public/company/CompanyContactCard";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import { ManufacturingHomepageSection } from "@/components/public/manufacturing/ManufacturingPublicSections";
import { getCompanySettings } from "@/features/settings/services/settings.service";
import { buildAboutMetadata } from "@/lib/seo/indexation-policy";
import { VERIFIED_EXPERIENCE_YEARS } from "@/lib/company-trust";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();

  return buildAboutMetadata({
    title: `Giới thiệu ${company.name} | Nguồn hàng B2B & OEM`,
    description:
      `Tìm hiểu năng lực ATTD — hơn ${VERIFIED_EXPERIENCE_YEARS} năm kinh nghiệm, showroom & kho hàng, OEM/Private Label và mạng lưới sản xuất cho đại lý, xưởng in và doanh nghiệp.`,
  });
}

export default async function GioiThieuPage() {
  const company = await getCompanySettings();

  return (
    <main className="company-about-page">
      <section className="company-about-hero">
        <div className="container">
          <p className="company-about-hero__eyebrow">Nguồn hàng B2B</p>
          <h1 className="company-about-hero__title">
            Đối tác nguồn hàng đồng phục &amp; OEM bạn có thể tin cậy
          </h1>
          <p className="company-about-hero__lead">
            Hơn {VERIFIED_EXPERIENCE_YEARS} năm kinh nghiệm từ AOTHUNTHONGDIEP và VietnamClothing.
            ATTD hỗ trợ đại lý, agency, xưởng in và doanh nghiệp lấy nguồn, báo giá và triển khai
            đồng phục, phôi trơn, quà tặng hoặc OEM/Private Label.
          </p>
          <div className="company-about-hero__actions">
            <Link href="/lien-he" className="btn-primary">
              Yêu cầu báo giá
            </Link>
            <Link href="/dai-ly" className="btn-secondary">
              Hợp tác đại lý
            </Link>
          </div>
        </div>
      </section>

      <CompanyFacts
        title="Vì sao đối tác chọn ATTD"
        description="Những điểm cốt lõi giúp bạn đánh giá năng lực trước khi gửi yêu cầu báo giá."
        variant="compact"
      />

      <WhyChooseAttd
        title="ATTD phù hợp khi bạn cần"
        description="Từ nguồn hàng trơn đến OEM — một đối tác B2B rõ ràng về năng lực và cách làm việc."
      />

      <MarketplaceRFQStrip />

      <ManufacturingHomepageSection
        title="Hình ảnh sản xuất thực tế"
        description="Minh chứng từ kho, xưởng và quy trình vận hành khi đã được công bố."
        limit={6}
        className="company-about-manufacturing"
      />

      <FactoryOverview />

      <CompanyTrustMetrics />

      <CustomerLogoStrip />

      <TestimonialSection />

      <CaseStudySection />

      <CompanyIntroSection company={company} />

      <CompanyTimeline
        title="Bối cảnh phát triển"
        description="Hành trình hình thành năng lực nguồn hàng và nền tảng B2B của ATTD."
      />

      <section className="mp-section mp-section--tight company-about-contact">
        <div className="container company-about-contact__grid">
          <div className="company-about-contact__copy">
            <h2 className="company-about-contact__title">Sẵn sàng nhận báo giá?</h2>
            <p className="company-about-contact__description">
              Gửi yêu cầu để đội ngũ ATTD tư vấn sản phẩm, số lượng, OEM và tiến độ phù hợp
              nhu cầu thực tế của bạn.
            </p>
            <div className="company-about-hero__actions">
              <Link href="/lien-he" className="btn-primary">
                Gửi yêu cầu báo giá
              </Link>
              <Link href="/san-pham" className="btn-secondary">
                Xem danh mục sản phẩm
              </Link>
            </div>
          </div>
          <CompanyContactCard company={company} showIntroLink={false} />
        </div>
      </section>
    </main>
  );
}
