import CompanyFacts from "@/components/public/company/CompanyFacts";
import CompanyTrustMetrics from "@/components/public/company/CompanyTrustMetrics";
import HomeWorkshopGallerySection from "@/components/home/HomeWorkshopGallerySection";
import type { HomepageCmsConfig } from "@/features/home/homepage.types";

type Props = {
  cms: HomepageCmsConfig;
};

export default function HomeOperationalCapabilitySection({ cms }: Props) {
  return (
    <section className="home-operational-capability" aria-labelledby="home-operational-capability-title">
      <div className="container">
        <header className="home-operational-capability__header">
          <p className="home-operational-capability__eyebrow">Thực tế triển khai</p>
          <h2 id="home-operational-capability-title" className="home-operational-capability__title">
            Năng lực triển khai thực tế
          </h2>
          <p className="home-operational-capability__description">
            Thông tin vận hành, năng lực công ty và hình ảnh thực tế — dựa trên dữ liệu ATTD đã
            xác minh.
          </p>
        </header>
      </div>

      <CompanyTrustMetrics className="home-operational-capability__metrics" variant="embedded" />

      <CompanyFacts
        className="home-operational-capability__facts"
        variant="compact"
        cms={cms.companyReality}
        hideHeader
      />

      <HomeWorkshopGallerySection gallery={cms.workshopGallery} embedded />
    </section>
  );
}
