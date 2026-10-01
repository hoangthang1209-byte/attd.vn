import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getHomepageData } from "@/features/home/homepage.service";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { buildHomepageMetadata } from "@/lib/seo/indexation-policy";
import { SITE_NAME, canonicalUrl, buildOgImages } from "@/lib/seo";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeWorkshopGallerySection from "@/components/home/HomeWorkshopGallerySection";
import CustomerLogoStrip from "@/components/public/company/CustomerLogoStrip";
import CaseStudySection from "@/components/public/CaseStudySection";

export const revalidate = 3600;

const TITLE = "ATTD | B2B Sourcing, Đồng phục, OEM & Merchandise";
const DESCRIPTION =
  "ATTD là đối tác B2B sourcing và production cho đồng phục doanh nghiệp, nguồn hàng, OEM/Private Label, quà tặng và merchandise.";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const ogImage = branding.defaultOgImageUrl ?? process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE ?? undefined;
  const ogImages = buildOgImages(ogImage);

  return buildHomepageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: canonicalUrl("/"),
      siteName: SITE_NAME,
      images: ogImages,
      type: "website",
    },
    twitter: { card: "summary_large_image", images: ogImages },
  });
}

const SOLUTIONS = [
  {
    key: "uniform",
    href: "/dong-phuc-doanh-nghiep",
    index: "01",
    label: "Đồng phục doanh nghiệp",
    title: "Từ brief đến bộ đồng phục sẵn sàng bàn giao.",
    description: "Tư vấn mẫu, chất liệu, in/thêu, size set, đóng gói và triển khai theo deadline.",
  },
  {
    key: "sourcing",
    href: "/nguon-hang",
    index: "02",
    label: "Nguồn hàng B2B",
    title: "Nguồn sản phẩm cho đại lý, agency và xưởng in.",
    description: "Hàng trơn, nhiều nhóm sản phẩm, MOQ rõ và hỗ trợ mở rộng danh mục bán hàng.",
  },
  {
    key: "oem",
    href: "/oem",
    index: "03",
    label: "OEM / Private Label",
    title: "Phát triển sản phẩm riêng thay vì mua mẫu có sẵn.",
    description: "Từ chất liệu, form, màu, nhãn đến packaging và quy trình duyệt mẫu trước bulk.",
  },
  {
    key: "gift",
    href: "/qua-tang-doanh-nghiep",
    index: "04",
    label: "Corporate Gifts",
    title: "Quà tặng doanh nghiệp được cấu hình theo chiến dịch.",
    description: "Gift set, apparel, túi, nón, bình và packaging đồng bộ nhận diện thương hiệu.",
  },
  {
    key: "merch",
    href: "/merchandise",
    index: "05",
    label: "Artist & Event Merchandise",
    title: "Merchandise cho concert, nghệ sĩ và chiến dịch quy mô lớn.",
    description: "Multi-SKU, sample approval, production, QC, packing và phân bổ giao hàng theo sự kiện.",
  },
] as const;

const OPERATING_MODEL = [
  ["01", "Brief", "Sản phẩm, số lượng, ngân sách, logo, deadline và yêu cầu thương hiệu."],
  ["02", "Develop", "ATTD chọn nguồn, cấu hình sản phẩm, costing và phát triển mẫu nếu cần."],
  ["03", "Approve", "Duyệt mẫu, màu, artwork, thông số và phương án hoàn thiện."],
  ["04", "Produce", "Điều phối sản xuất, in/thêu/OEM và kiểm soát tiến độ theo từng hạng mục."],
  ["05", "QC & Deliver", "Kiểm hàng, đóng gói, chia batch và giao theo kế hoạch dự án."],
] as const;

export default async function HomePage() {
  const [
    { cms, latestProducts },
    heroMedia,
    uniformMedia,
    sourcingMedia,
    oemMedia,
    giftMedia,
    merchMedia,
  ] = await Promise.all([
    getHomepageData(),
    getPublicSurfaceMedia("homepage"),
    getPublicSurfaceMedia("uniform"),
    getPublicSurfaceMedia("sourcing"),
    getPublicSurfaceMedia("oem"),
    getPublicSurfaceMedia("corporateGift"),
    getPublicSurfaceMedia("merchandise"),
  ]);

  const mediaByKey = {
    uniform: uniformMedia,
    sourcing: sourcingMedia,
    oem: oemMedia,
    gift: giftMedia,
    merch: merchMedia,
  };

  return (
    <main className="v7-home">
      <section className="v7-home-hero">
        <div className="container v7-home-hero__grid">
          <div className="v7-home-hero__copy">
            <p className="v7-kicker">B2B sourcing & production partner</p>
            <h1>
              Một đầu mối.
              <br />
              Nhiều loại sản phẩm.
              <br />
              Một chuẩn triển khai.
            </h1>
            <p className="v7-home-hero__lead">
              ATTD giúp doanh nghiệp, agency, đại lý và thương hiệu biến một brief thành
              sản phẩm hoàn chỉnh — từ sourcing, customization đến OEM và merchandise.
            </p>
            <div className="v7-home-hero__actions">
              <Link href="/lien-he" className="v7-btn v7-btn--primary">Gửi brief dự án</Link>
              <Link href="/san-pham" className="v7-btn v7-btn--ghost">Xem nguồn hàng</Link>
            </div>
            <div className="v7-home-hero__meta">
              <span>Kho · QC · hoàn thiện tại TP.HCM</span>
              <span>In · thêu · OEM · packaging</span>
              <span>Giao hàng toàn quốc</span>
            </div>
          </div>

          <div className="v7-home-hero__visual">
            {heroMedia ? (
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt}
                fill
                priority
                className="v7-home-hero__image"
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            ) : (
              <div className="v7-home-hero__fallback">ATTD</div>
            )}
            <div className="v7-home-hero__caption">
              <span>ATTD / 2026</span>
              <strong>Sourcing → Development → Production → Delivery</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="v7-solutions" id="giai-phap">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">05 business engines</p>
              <h2>Chọn theo bài toán kinh doanh, không phải theo loại áo.</h2>
            </div>
            <p>
              Mỗi nhu cầu có một flow khác nhau. ATTD tách rõ để đội mua hàng đi thẳng
              vào đúng sản phẩm, đúng cách báo giá và đúng mô hình triển khai.
            </p>
          </header>

          <div className="v7-solutions__list">
            {SOLUTIONS.map((solution) => {
              const media = mediaByKey[solution.key];
              return (
                <Link key={solution.key} href={solution.href} className="v7-solution-row">
                  <span className="v7-solution-row__index">{solution.index}</span>
                  <div className="v7-solution-row__media">
                    {media ? (
                      <Image src={media.url} alt={media.alt} fill className="v7-solution-row__image" sizes="(max-width: 760px) 100vw, 34vw" />
                    ) : null}
                  </div>
                  <div className="v7-solution-row__copy">
                    <span>{solution.label}</span>
                    <h3>{solution.title}</h3>
                    <p>{solution.description}</p>
                  </div>
                  <ArrowUpRight className="v7-solution-row__arrow" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="v7-operating" id="nang-luc">
        <div className="container">
          <header className="v7-section-head v7-section-head--dark">
            <div>
              <p className="v7-kicker v7-kicker--light">Operating model</p>
              <h2>ATTD không chỉ bán sản phẩm. ATTD vận hành cả dự án.</h2>
            </div>
            <p>
              Giá trị cốt lõi nằm ở việc giảm độ phức tạp của procurement: một đầu mối
              quản lý nguồn hàng, mẫu, production, QC và delivery.
            </p>
          </header>

          <ol className="v7-operating__steps">
            {OPERATING_MODEL.map(([index, title, description]) => (
              <li key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HomeProductDiscoverySection products={latestProducts} />

      <section className="v7-proof">
        <div className="container">
          <div className="v7-proof__intro">
            <p className="v7-kicker">Proof over claims</p>
            <h2>Năng lực phải nhìn thấy được.</h2>
            <p>
              Kho, QC, mẫu thật, quy trình hoàn thiện và dự án thực tế là cách ATTD chứng minh khả năng triển khai.
            </p>
          </div>
          <HomeWorkshopGallerySection gallery={cms.workshopGallery} />
        </div>
      </section>

      <CustomerLogoStrip />
      <CaseStudySection />

      <section className="v7-home-final">
        <div className="container v7-home-final__inner">
          <p className="v7-kicker v7-kicker--light">Start with a brief</p>
          <h2>Không cần biết chính xác phải đặt sản phẩm nào.</h2>
          <p>Chỉ cần cho ATTD biết mục tiêu, số lượng và deadline. Đội ngũ sẽ đề xuất phương án phù hợp.</p>
          <Link href="/lien-he" className="v7-home-final__link">
            Gửi yêu cầu dự án <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
    </main>
  );
}
