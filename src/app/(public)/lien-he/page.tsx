import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import ContactForm from "@/components/public/ContactForm";
import PublicContactChannels from "@/components/public/PublicContactChannels";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { buildContactMetadata } from "@/lib/seo/indexation-policy";

export const revalidate = 3600;
export const metadata: Metadata = buildContactMetadata({
  title: "Liên hệ tư vấn & báo giá | ATTD",
  description:
    "Gửi nhu cầu cho ATTD để được tư vấn sản phẩm, số lượng, ngân sách, thời gian và nhận báo giá phù hợp.",
});

const BRIEF = [
  ["01","Bạn cần làm gì?","Có thể gửi tên sản phẩm, hình tham khảo hoặc chỉ cần mô tả nhu cầu."],
  ["02","Số lượng dự kiến","Chưa cần chính xác ngay, số lượng ước tính cũng đủ để tư vấn ban đầu."],
  ["03","Logo & hoàn thiện","Logo, hình in/thêu, nhãn hoặc yêu cầu đóng gói nếu có."],
  ["04","Thời gian cần hàng","Cho ATTD biết ngày cần nhận hàng hoặc ngày diễn ra sự kiện."],
] as const;

export default async function ContactPage() {
  const media = await getPublicSurfaceMedia("contact");

  return (
    <main className="v7-contact">
      <section className="v7-contact__hero">
        <div className="container v7-contact__grid">
          <div className="v7-contact__intro">
            <p className="v7-kicker">Gửi nhu cầu cho ATTD</p>
            <h1>Bạn chưa cần chuẩn bị mọi thứ thật đầy đủ.</h1>
            <p>
              Chỉ cần gửi những thông tin bạn đang có. ATTD sẽ cùng bạn làm rõ sản phẩm,
              số lượng, cách hoàn thiện và thời gian trước khi báo giá.
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
