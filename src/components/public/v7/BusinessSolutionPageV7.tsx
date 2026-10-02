import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

type Media = { url: string; alt: string } | null;

type Props = {
  kicker: string;
  title: string;
  lead: string;
  audience: string;
  promise: string;
  media: Media;
  capabilities: readonly { title: string; description: string }[];
  process: readonly { title: string; description: string }[];
  outcomes: readonly string[];
  ctaLabel?: string;
  leadCapture?: ReactNode;
  seoContent?: string | null;
};

export default function BusinessSolutionPageV7({
  kicker,
  title,
  lead,
  audience,
  promise,
  media,
  capabilities,
  process,
  outcomes,
  ctaLabel = "Nhận tư vấn & báo giá",
  leadCapture,
  seoContent,
}: Props) {
  const contactHref = `/lien-he?service=${encodeURIComponent(kicker)}`;

  return (
    <main className="v7-solution-page">
      <section className="v7-solution-hero">
        <div className="container v7-solution-hero__grid">
          <div className="v7-solution-hero__copy">
            <p className="v7-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="v7-solution-hero__lead">{lead}</p>
            <div className="v7-solution-hero__actions">
              <Link href={contactHref} className="v7-btn v7-btn--primary">{ctaLabel}</Link>
              <Link href="/san-pham" className="v7-btn v7-btn--ghost">Xem sản phẩm</Link>
            </div>
          </div>
          <div className="v7-solution-hero__visual">
            {media ? (
              <Image src={media.url} alt={media.alt} fill priority className="v7-solution-hero__image" sizes="(max-width:900px) 100vw, 50vw" />
            ) : (
              <div className="v7-solution-hero__fallback">ATTD</div>
            )}
          </div>
        </div>
        <div className="container v7-solution-hero__brief">
          <div><span>Phù hợp với</span><strong>{audience}</strong></div>
          <div><span>ATTD hỗ trợ</span><strong>{promise}</strong></div>
        </div>
      </section>

      <section className="v7-capabilities">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">ATTD sẽ hỗ trợ những gì?</p>
              <h2>Một đầu mối để bạn dễ làm việc và dễ kiểm soát tiến độ.</h2>
            </div>
            <p>
              ATTD phối hợp từ chọn sản phẩm, làm mẫu, hoàn thiện thương hiệu đến sản xuất và giao hàng.
            </p>
          </header>
          <div className="v7-capabilities__grid">
            {capabilities.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="v7-deliverables">
        <div className="container v7-deliverables__grid">
          <div>
            <p className="v7-kicker v7-kicker--light">Bạn sẽ nhận được gì?</p>
            <h2>Chốt rõ trước khi sản xuất để hạn chế phát sinh.</h2>
          </div>
          <ul>
            {outcomes.map((item) => <li key={item}><span>✓</span>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="v7-process">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">Cách triển khai</p>
              <h2>Từ yêu cầu ban đầu đến khi nhận hàng.</h2>
            </div>
            <p>Mỗi bước đều được chốt rõ để giảm sửa đổi, kiểm soát chi phí và giữ đúng tiến độ.</p>
          </header>
          <ol className="v7-process__list">
            {process.map((item, index) => (
              <li key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {seoContent ? (
        <section className="v7-seo-content">
          <div
            className="container v7-seo-content__inner"
            dangerouslySetInnerHTML={{ __html: seoContent }}
          />
        </section>
      ) : null}

      {leadCapture ? (
        <section className="v7-solution-lead">
          <div className="container v7-solution-lead__grid">
            <div className="v7-solution-lead__intro">
              <p className="v7-kicker">Nhận tư vấn & báo giá</p>
              <h2>Gửi nhu cầu để ATTD tư vấn phương án phù hợp.</h2>
              <p>
                Bạn có thể gửi thông tin đang có trước. Đội ngũ ATTD sẽ liên hệ lại
                để làm rõ sản phẩm, số lượng, ngân sách và thời gian cần hàng.
              </p>
            </div>
            <div className="v7-solution-lead__form">{leadCapture}</div>
          </div>
        </section>
      ) : null}

      <section className="v7-solution-final">
        <div className="container v7-solution-final__inner">
          <div>
            <p className="v7-kicker v7-kicker--light">Trao đổi với ATTD</p>
            <h2>Gửi nhu cầu, số lượng và thời gian cần hàng.</h2>
          </div>
          <Link href={contactHref} className="v7-solution-final__link">
            {ctaLabel} <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
    </main>
  );
}
