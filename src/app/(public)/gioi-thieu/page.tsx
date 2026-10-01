import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCompanySettings } from "@/features/settings/services/settings.service";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import CustomerLogoStrip from "@/components/public/company/CustomerLogoStrip";
import CaseStudySection from "@/components/public/CaseStudySection";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Về ATTD | B2B Sourcing & Production Partner",
  description: "ATTD là đối tác sourcing, customization, OEM và merchandise cho doanh nghiệp, agency, đại lý và thương hiệu.",
};

const MODEL = [
  ["01","Asset-light","ATTD không cố sở hữu mọi công đoạn. Chúng tôi sở hữu cách điều phối dự án, dữ liệu và chuẩn kiểm soát."],
  ["02","Operations-heavy","Nguồn hàng, sample, production, QC, packing và delivery được quản lý như một hệ thống."],
  ["03","B2B-first","Website, báo giá và quy trình được thiết kế cho đơn hàng có MOQ, nhiều SKU và yêu cầu riêng."],
] as const;

export default async function AboutPage() {
  const [company, media] = await Promise.all([
    getCompanySettings(),
    getPublicSurfaceMedia("about"),
  ]);

  return (
    <main className="v7-about">
      <section className="v7-about-hero">
        <div className="container v7-about-hero__grid">
          <div>
            <p className="v7-kicker">About ATTD</p>
            <h1>Không phải một xưởng đơn lẻ. Là một hệ thống triển khai B2B.</h1>
            <p>
              ATTD kết nối sourcing, customization, OEM, merchandise và corporate gifts
              trong cùng một mô hình vận hành — một đầu mối xuyên suốt từ brief đến bàn giao.
            </p>
            <Link href="/lien-he" className="v7-btn v7-btn--primary">Trao đổi dự án</Link>
          </div>
          <div className="v7-about-hero__media">
            {media ? <Image src={media.url} alt={media.alt} fill priority className="v7-about-hero__image" sizes="(max-width:900px) 100vw, 50vw" /> : null}
          </div>
        </div>
      </section>

      <section className="v7-about-model">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">Business model</p>
              <h2>Giá trị của ATTD nằm ở khả năng giảm độ phức tạp.</h2>
            </div>
            <p>
              Khách hàng không cần tự kết nối nhiều xưởng, nhiều nguồn hàng và nhiều bên hoàn thiện.
              ATTD đứng giữa và chịu trách nhiệm điều phối.
            </p>
          </header>
          <div className="v7-about-model__grid">
            {MODEL.map(([index,title,description])=>(
              <article key={index}><span>{index}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="v7-about-company">
        <div className="container v7-about-company__grid">
          <div>
            <p className="v7-kicker v7-kicker--light">Company</p>
            <h2>{company.name}</h2>
          </div>
          <div>
            <p>
              Từ nền tảng đồng phục và hàng may mặc, ATTD mở rộng thành một hệ thống B2B
              phục vụ nhiều loại nhu cầu: hàng có sẵn, OEM, corporate gifts và merchandise.
            </p>
            <Link href="/#giai-phap">Xem 5 nhóm giải pháp <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>

      <CustomerLogoStrip />
      <CaseStudySection />
    </main>
  );
}
