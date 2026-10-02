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

const TITLE = "ATTD | Đồng phục, nguồn hàng, OEM, quà tặng & merchandise";
const DESCRIPTION =
  "ATTD đồng hành cùng doanh nghiệp, đại lý, agency và thương hiệu từ chọn sản phẩm, làm mẫu, sản xuất, hoàn thiện đến giao hàng.";

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
    title: "Làm đồng phục doanh nghiệp từ mẫu đến giao hàng.",
    description: "Tư vấn mẫu, chất liệu, in/thêu, chia size, đóng gói và giao theo kế hoạch của doanh nghiệp.",
  },
  {
    key: "sourcing",
    href: "/nguon-hang",
    index: "02",
    label: "Nguồn hàng B2B",
    title: "Tìm nguồn hàng ổn định để bán hoặc hoàn thiện theo đơn.",
    description: "Áo, nón, túi, quà tặng và nhiều nhóm hàng khác, có thông tin số lượng tối thiểu và thời gian rõ ràng.",
  },
  {
    key: "oem",
    href: "/oem",
    index: "03",
    label: "OEM / Private Label",
    title: "Phát triển sản phẩm riêng theo yêu cầu thương hiệu.",
    description: "Từ chất liệu, form, màu, nhãn, bao bì đến làm mẫu và sản xuất số lượng lớn.",
  },
  {
    key: "gift",
    href: "/qua-tang-doanh-nghiep",
    index: "04",
    label: "Quà tặng doanh nghiệp",
    title: "Làm bộ quà tặng theo ngân sách và mục tiêu chương trình.",
    description: "Kết hợp nhiều sản phẩm, in logo, đóng bộ và hoàn thiện bao bì theo nhận diện thương hiệu.",
  },
  {
    key: "merch",
    href: "/merchandise",
    index: "05",
    label: "Merchandise nghệ sĩ & sự kiện",
    title: "Sản xuất merchandise cho nghệ sĩ, concert và sự kiện.",
    description: "Quản lý nhiều mẫu, nhiều size, duyệt mẫu, sản xuất, kiểm hàng, đóng gói và giao theo lịch sự kiện.",
  },
] as const;

const OPERATING_MODEL = [
  ["01", "Tiếp nhận nhu cầu", "Sản phẩm, số lượng, ngân sách, logo, thời gian cần hàng và các yêu cầu đặc biệt."],
  ["02", "Đề xuất phương án", "ATTD chọn nguồn hàng, đề xuất cấu hình, tính giá và làm mẫu khi cần."],
  ["03", "Duyệt mẫu", "Chốt mẫu, màu, thiết kế in/thêu, thông số và cách hoàn thiện."],
  ["04", "Sản xuất", "Điều phối các công đoạn và theo dõi tiến độ theo từng hạng mục."],
  ["05", "Kiểm hàng & giao", "Kiểm chất lượng, đóng gói, chia đợt và giao theo kế hoạch."],
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
            <p className="v7-kicker">Đồng phục · nguồn hàng · OEM · quà tặng · merchandise</p>
            <h1>
              Từ một nhu cầu.
              <br />
              Thành sản phẩm hoàn chỉnh.
              <br />
              Qua một đầu mối.
            </h1>
            <p className="v7-home-hero__lead">
              Bạn chỉ cần cho ATTD biết cần làm gì, số lượng bao nhiêu và khi nào cần hàng.
              Đội ngũ sẽ cùng bạn chọn phương án phù hợp, báo giá và theo sát đến khi giao hàng.
            </p>
            <div className="v7-home-hero__actions">
              <Link href="/lien-he" className="v7-btn v7-btn--primary">Nhận tư vấn & báo giá</Link>
              <Link href="/san-pham" className="v7-btn v7-btn--ghost">Xem sản phẩm</Link>
            </div>
            <div className="v7-home-hero__meta">
              <span>Kho · kiểm hàng · đóng gói tại TP.HCM</span>
              <span>In · thêu · OEM · đóng gói</span>
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
              <span>ATTD / TP.HCM</span>
              <strong>Tư vấn → Làm mẫu → Sản xuất → Giao hàng</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="v7-solutions" id="giai-phap">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">ATTD có thể hỗ trợ bạn</p>
              <h2>Bạn đang cần làm gì?</h2>
            </div>
            <p>
              Chọn đúng nhu cầu để xem cách ATTD triển khai, sản phẩm phù hợp
              và những thông tin cần chuẩn bị để nhận báo giá nhanh hơn.
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
              <p className="v7-kicker v7-kicker--light">Cách ATTD làm việc</p>
              <h2>Một đầu mối theo dự án từ đầu đến cuối.</h2>
            </div>
            <p>
              Thay vì phải làm việc với nhiều bên, bạn có thể trao đổi với một đầu mối
              từ chọn hàng, làm mẫu, sản xuất, kiểm hàng đến giao hàng.
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
            <p className="v7-kicker">Năng lực thực tế</p>
            <h2>Xem năng lực qua công việc thực tế.</h2>
            <p>
              Hình ảnh kho, mẫu thật, công đoạn hoàn thiện và các dự án đã làm giúp bạn đánh giá ATTD trước khi hợp tác.
            </p>
          </div>
          <HomeWorkshopGallerySection gallery={cms.workshopGallery} />
        </div>
      </section>

      <CustomerLogoStrip />
      <CaseStudySection />

      <section className="v7-home-final">
        <div className="container v7-home-final__inner">
          <p className="v7-kicker v7-kicker--light">Bắt đầu đơn giản</p>
          <h2>Bạn chưa chốt sản phẩm cũng không sao.</h2>
          <p>Hãy gửi nhu cầu, số lượng dự kiến và thời gian cần hàng. ATTD sẽ cùng bạn chọn phương án phù hợp.</p>
          <Link href="/lien-he" className="v7-home-final__link">
            Nhận tư vấn & báo giá <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
    </main>
  );
}
