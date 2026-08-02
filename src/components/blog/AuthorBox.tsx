import Link from "next/link";

/**
 * Only claims ATTD can support: who edited the piece, in what capacity, and
 * how to reach them. No avatar photo, article count or years of experience —
 * the brand mark stands in for a portrait we do not have.
 */
export default function AuthorBox() {
  return (
    <aside className="blog-author-box" aria-label="Về tác giả">
      <div className="blog-author-box-inner">
        <div className="blog-author-box-avatar" aria-hidden="true">
          ATTD
        </div>

        <div className="blog-author-box-content">
          <p className="blog-author-box-label">Biên tập bởi</p>
          <p className="blog-author-box-name">Đội ngũ nội dung ATTD</p>
          <p className="blog-author-box-role">Tư vấn nguồn hàng &amp; sản xuất đồng phục B2B</p>
          <p className="blog-author-box-bio">
            Nội dung được biên soạn từ kinh nghiệm tư vấn nguồn hàng đồng phục, quà tặng doanh
            nghiệp và OEM/private label cho khách B2B.
          </p>
          <Link href="/lien-he" className="blog-author-box-link">
            Trao đổi với ATTD
          </Link>
        </div>
      </div>
    </aside>
  );
}
