import Link from "next/link";

export default function AuthorBox() {
  return (
    <aside className="blog-author-box">
      <div className="blog-author-box-inner">
        <p className="blog-author-box-label">Tác giả</p>
        <h3 className="blog-author-box-name">ATTD Editorial Team</h3>
        <p className="blog-author-box-bio">
          Chuyên chia sẻ kiến thức về:
        </p>
        <ul className="blog-author-box-topics">
          <li>nguồn hàng</li>
          <li>OEM</li>
          <li>đồng phục</li>
          <li>quà tặng doanh nghiệp</li>
        </ul>
        <Link href="/gioi-thieu" className="blog-author-box-link">
          Tìm hiểu thêm về ATTD →
        </Link>
      </div>
    </aside>
  );
}
