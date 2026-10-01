import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCompanySettings } from "@/features/settings/services/settings.service";
import { buildAboutMetadata } from "@/lib/seo/indexation-policy";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import CustomerLogoStrip from "@/components/public/company/CustomerLogoStrip";
import CaseStudySection from "@/components/public/CaseStudySection";

export const revalidate = 3600;
export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  return buildAboutMetadata({
    title: `Về ${company.name} | Đồng phục, OEM, nguồn hàng & merchandise`,
    description:
      "ATTD đồng hành cùng doanh nghiệp, agency, đại lý và thương hiệu từ tìm nguồn hàng, làm mẫu, sản xuất đến hoàn thiện và giao hàng.",
  });
}

const MODEL = [
  ["01","Một đầu mối","Khách hàng không cần tự làm việc với nhiều bên. ATTD đứng giữa để điều phối và theo sát toàn bộ dự án."],
  ["02","Theo sát từng công đoạn","Nguồn hàng, làm mẫu, sản xuất, kiểm hàng, đóng gói và giao hàng được quản lý theo cùng một kế hoạch."],
  ["03","Phù hợp đơn hàng B2B","Quy trình phù hợp các đơn có số lượng, nhiều mẫu, nhiều size hoặc yêu cầu hoàn thiện riêng."],
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
            <p className="v7-kicker">Về ATTD</p>
            <h1>Một đầu mối để triển khai nhiều loại sản phẩm B2B.</h1>
            <p>
              ATTD kết nối nguồn hàng, đồng phục, OEM, quà tặng và merchandise
              trong cùng một quy trình — từ nhu cầu ban đầu đến khi giao hàng.
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
              <p className="v7-kicker">Mô hình kinh doanh</p>
              <h2>Giúp khách hàng làm việc đơn giản hơn.</h2>
            </div>
            <p>
              Thay vì phải tự kết nối nhiều xưởng, nguồn hàng và đơn vị hoàn thiện,
              khách hàng có thể làm việc với một đầu mối tại ATTD.
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
            <p className="v7-kicker v7-kicker--light">Doanh nghiệp</p>
            <h2>{company.name}</h2>
          </div>
          <div>
            <p>
              Từ nền tảng đồng phục và hàng may mặc, ATTD mở rộng để phục vụ thêm
              nguồn hàng, OEM, quà tặng doanh nghiệp và merchandise.
            </p>
            <Link href="/#giai-phap">Xem các dịch vụ của ATTD <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>

      <CustomerLogoStrip />
      <CaseStudySection />
    </main>
  );
}
