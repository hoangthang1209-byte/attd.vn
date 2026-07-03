import Link from "next/link";

export default function AuthorBox() {
  return (
    <aside className="blog-author-box">
      <div className="blog-author-box-inner">
        <p className="blog-author-box-label">Biên tập bởi</p>
        <h3 className="blog-author-box-name">Đội ngũ ATTD</h3>
        <p className="blog-author-box-bio">
          Nội dung được biên soạn từ kinh nghiệm tư vấn nguồn hàng đồng phục, quà tặng doanh nghiệp và OEM/private label cho khách B2B.
        </p>
        <Link href="/lien-he" className="blog-author-box-link">
          Trao đổi với ATTD →
        </Link>
      </div>
    </aside>
  );
}
