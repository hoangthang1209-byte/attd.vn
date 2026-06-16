import Link from "next/link";

export default function BlogArticleCta() {
  return (
    <section className="blog-article-cta">
      <div className="container">
        <div className="blog-article-cta-inner">
          <div>
            <h2 className="blog-article-cta-title">
              Cần nguồn hàng cho nội dung này?
            </h2>
            <p className="blog-article-cta-desc">
              Liên hệ ATTD để được tư vấn MOQ, lead-time và báo giá sỉ theo số lượng.
            </p>
          </div>
          <Link href="/lien-he" className="btn-primary">
            Liên hệ ATTD
          </Link>
        </div>
      </div>
    </section>
  );
}
