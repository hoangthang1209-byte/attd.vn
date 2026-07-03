import Link from "next/link";

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
          </div>
          <Link href="/lien-he" className="btn-primary">
            Gửi yêu cầu báo giá
          </Link>
        </div>
      </div>
    </section>
  );
}
