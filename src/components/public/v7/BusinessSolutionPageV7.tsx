import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
  ctaLabel = "Gửi brief dự án",
}: Props) {
  return (
    <main className="v7-solution-page">
      <section className="v7-solution-hero">
        <div className="container v7-solution-hero__grid">
          <div className="v7-solution-hero__copy">
            <p className="v7-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="v7-solution-hero__lead">{lead}</p>
            <div className="v7-solution-hero__actions">
              <Link href="/lien-he" className="v7-btn v7-btn--primary">{ctaLabel}</Link>
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
          <div><span>Phù hợp cho</span><strong>{audience}</strong></div>
          <div><span>ATTD chịu trách nhiệm</span><strong>{promise}</strong></div>
        </div>
      </section>

      <section className="v7-capabilities">
        <div className="container">
          <header className="v7-section-head">
            <div>
              <p className="v7-kicker">Scope of work</p>
              <h2>Một đối tác xuyên suốt thay vì nhiều nhà cung cấp rời rạc.</h2>
            </div>
            <p>
              ATTD kết nối sourcing, phát triển sản phẩm, hoàn thiện thương hiệu và vận hành production thành một flow duy nhất.
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
            <p className="v7-kicker v7-kicker--light">What you get</p>
            <h2>Kết quả phải rõ trước khi bắt đầu sản xuất.</h2>
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
              <p className="v7-kicker">Project flow</p>
              <h2>Từ brief đến giao hàng.</h2>
            </div>
            <p>Mỗi bước đều có đầu ra rõ để giảm vòng sửa, kiểm soát cost và giữ đúng deadline.</p>
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

      <section className="v7-solution-final">
        <div className="container v7-solution-final__inner">
          <div>
            <p className="v7-kicker v7-kicker--light">Next step</p>
            <h2>Gửi mục tiêu, số lượng và deadline.</h2>
          </div>
          <Link href="/lien-he" className="v7-solution-final__link">
            {ctaLabel} <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
    </main>
  );
}
