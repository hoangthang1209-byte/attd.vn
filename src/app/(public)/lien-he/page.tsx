import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ContactForm from "@/components/public/ContactForm";
import PublicContactChannels from "@/components/public/PublicContactChannels";
import CompanyContactCard from "@/components/public/company/CompanyContactCard";
import ProcessTrustBlock from "@/components/public/trust/ProcessTrustBlock";
import {
  CONTACT_PROCESS_STEPS,
  TRUST_REASSURANCE_PRIVACY,
} from "@/lib/b2b-trust-v2-copy";
import { buildContactMetadata } from "@/lib/seo/indexation-policy";
import { getCompanySettings } from "@/features/settings/services/settings.service";

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

export default async function LienHePage() {
  const company = await getCompanySettings();

  return (
    <main className="contact-page-v2">
      <section className="section contact-page-v2__section">
        <div className="container">
          <div className="contact-page-v2__grid">
            {/* Left: Context */}
            <div>
              <div className="contact-page-v2__eyebrow">
                Liên hệ B2B
              </div>

              <h1 className="contact-page-v2__title">Liên hệ báo giá</h1>

              <p className="contact-page-v2__lead">
                Dành cho đại lý, xưởng in, doanh nghiệp cần nguồn hàng đồng
                phục và quà tặng số lượng lớn. Chúng tôi sẽ phản hồi trong
                vòng 24 giờ làm việc.
              </p>

              <div className="contact-page-v2__cards">
                {CONTEXT_CARDS.map((card) => (
                  <div key={card.title} className="card contact-page-v2__card">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                ))}
              </div>

              <ProcessTrustBlock
                title="Sau khi gửi yêu cầu"
                steps={CONTACT_PROCESS_STEPS}
                reassurance={TRUST_REASSURANCE_PRIVACY}
                className="contact-page-v2__process"
              />

              <PublicContactChannels className="contact-page-v2__channels" />

              <CompanyContactCard company={company} className="contact-page-v2__company-card" />

              <p className="contact-page-v2__dealer-link">
                Muốn trở thành đại lý chính thức?{" "}
                <Link href="/dai-ly">
                  Đăng ký đại lý →
                </Link>
              </p>
            </div>

            {/* Right: Form */}
            <div>
              <Suspense fallback={<div className="lead-form public-lead-form public-lead-form--contact" aria-busy="true" />}>
                <ContactForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
