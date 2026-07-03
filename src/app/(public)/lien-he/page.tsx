import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/public/ContactForm";
import EvidenceGrid from "@/components/public/trust/EvidenceGrid";
import ProcessTrustBlock from "@/components/public/trust/ProcessTrustBlock";
import {
  CONTACT_EVIDENCE_ITEMS,
  CONTACT_PROCESS_STEPS,
  TRUST_REASSURANCE_PRIVACY,
} from "@/lib/b2b-trust-v2-copy";
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

              <EvidenceGrid
                title="ATTD xử lý yêu cầu như thế nào"
                items={CONTACT_EVIDENCE_ITEMS}
                className="contact-page-v2__evidence"
              />

              <p className="contact-page-v2__dealer-link">
                Muốn trở thành đại lý chính thức?{" "}
                <Link href="/dai-ly">
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
