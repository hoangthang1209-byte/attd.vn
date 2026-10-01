import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import ContactForm from "@/components/public/ContactForm";
import PublicContactChannels from "@/components/public/PublicContactChannels";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { buildContactMetadata } from "@/lib/seo/indexation-policy";

export const revalidate = 3600;
export const metadata: Metadata = buildContactMetadata({
  title: "Gửi brief & yêu cầu báo giá | ATTD",
  description:
    "Gửi brief dự án cho ATTD: sản phẩm, số lượng, logo, ngân sách và deadline. Phù hợp đồng phục, sourcing, OEM, quà tặng và merchandise.",
});

const BRIEF = [
  ["01","Bạn cần gì?","Sản phẩm, nhóm hàng hoặc chỉ cần mô tả mục tiêu."],
  ["02","Số lượng","Ước tính ban đầu cũng đủ để ATTD chọn đúng hướng."],
  ["03","Branding","Logo, artwork, in/thêu, nhãn, packaging nếu có."],
  ["04","Deadline","Ngày cần hàng hoặc ngày diễn ra campaign/event."],
] as const;

export default async function ContactPage() {
  const media = await getPublicSurfaceMedia("contact");

  return (
    <main className="v7-contact">
      <section className="v7-contact__hero">
        <div className="container v7-contact__grid">
          <div className="v7-contact__intro">
            <p className="v7-kicker">Bắt đầu từ brief</p>
            <h1>Không cần viết một RFQ hoàn hảo.</h1>
            <p>
              Gửi những gì bạn đang có. ATTD sẽ giúp làm rõ sản phẩm, số lượng,
              cấu hình và timeline trước khi báo giá.
            </p>
            {media ? (
              <div className="v7-contact__media">
                <Image src={media.url} alt={media.alt} fill className="v7-contact__image" sizes="(max-width:900px) 100vw, 44vw" />
              </div>
            ) : null}
            <div className="v7-contact__brief-list">
              {BRIEF.map(([index,title,description])=>(
                <div key={index}><span>{index}</span><strong>{title}</strong><p>{description}</p></div>
              ))}
            </div>
            <PublicContactChannels className="v7-contact__channels" />
          </div>

          <div className="v7-contact__form">
            <Suspense fallback={<div className="lead-form public-lead-form public-lead-form--contact" aria-busy="true" />}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
