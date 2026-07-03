import Link from "next/link";
import ProcessTrustBlock from "@/components/public/trust/ProcessTrustBlock";
import { BLOG_CTA_POINTS } from "@/lib/b2b-trust-v2-copy";

export default function BlogArticleCta() {
  return (
    <section className="blog-article-cta">
      <div className="container">
        <div className="blog-article-cta-inner">
          <div>
            <h2 className="blog-article-cta-title">
              Cần tư vấn nguồn hàng?
            </h2>
            <p className="blog-article-cta-desc">
              Gửi nhu cầu sản phẩm, số lượng và logo. ATTD sẽ tư vấn phương án sourcing phù hợp cho doanh nghiệp hoặc đại lý.
            </p>
            <ProcessTrustBlock
              steps={BLOG_CTA_POINTS}
              ordered={false}
              variant="compact"
              className="blog-article-cta__trust"
            />
          </div>
          <Link href="/lien-he" className="btn-primary">
            Gửi yêu cầu báo giá
          </Link>
        </div>
      </div>
    </section>
  );
}
