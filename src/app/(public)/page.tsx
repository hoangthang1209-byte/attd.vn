import { getCategories } from "@/features/categories/services/category.service";
import { getProducts } from "@/features/products/services/product.service";
import Section from "@/components/public/Section";
import ProductCard from "@/components/public/ProductCard";
import TrackedLink from "@/components/analytics/TrackedLink";

export default async function HomePage() {
  const categories = await getCategories();
  const products = await getProducts();

  return (
    <main>
      <section className="section">
        <div className="container">
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              marginBottom: "16px",
              maxWidth: "800px",
            }}
          >
            Kho sỉ đồng phục và quà tặng doanh nghiệp
          </h1>

          <p
            style={{
              fontSize: "20px",
              color: "#6b7280",
              maxWidth: "700px",
              lineHeight: 1.7,
            }}
          >
            Nguồn hàng cho đại lý, xưởng in và doanh nghiệp trên toàn quốc. Hàng có sẵn, nhiều màu, nhiều size, giá sỉ tận kho và giao hàng nhanh.
          </p>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "32px",
            }}
          >
            <a className="btn-primary" href="/ao-thun-tron">
              Xem sản phẩm
            </a>

            <TrackedLink
              href="/dai-ly"
              trackEvent="dealer_registration_click"
              trackSource="HOMEPAGE"
              className="card"
            >
              Đăng ký đại lý
            </TrackedLink>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginTop: "48px",
            }}
          >
            <div className="card">
              <strong>1000+</strong>
              <div>SKU nguồn hàng</div>
            </div>

            <div className="card">
              <strong>Toàn quốc</strong>
              <div>Giao hàng nhanh</div>
            </div>

            <div className="card">
              <strong>B2B</strong>
              <div>Đại lý & doanh nghiệp</div>
            </div>

            <div className="card">
              <strong>OEM</strong>
              <div>Private Label theo yêu cầu</div>
            </div>
          </div>
        </div>
      </section>

      <Section title="Danh mục nổi bật">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {categories.map((category) => (
            <a
              key={category.id}
              className="card"
              href={`/${category.slug}`}
            >
              {category.name}
            </a>
          ))}
        </div>
      </Section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">
            Sản phẩm nổi bật
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {products.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                productCode={product.productCode}
                skuCount={product.variants.length}
                category={product.category?.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">
            ATTD dành cho ai?
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="card">
              <h3>Đại lý</h3>
              <p>
                Nguồn hàng ổn định, nhiều mẫu mã,
                chính sách giá theo cấp độ.
              </p>
            </div>

            <div className="card">
              <h3>Xưởng in</h3>
              <p>
                Áo thun, polo, nón và tote trơn
                sẵn kho, phù hợp in theo yêu cầu.
              </p>
            </div>

            <div className="card">
              <h3>Doanh nghiệp</h3>
              <p>
                Đồng phục và quà tặng doanh nghiệp
                với số lượng từ nhỏ đến lớn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Tại sao chọn ATTD?</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="card">Kho hàng có sẵn</div>
            <div className="card">Nhiều màu - nhiều size</div>
            <div className="card">Giá sỉ tận kho</div>
            <div className="card">Giao hàng toàn quốc</div>
          </div>
        </div>
      </section>

      {/* B2B Solutions */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container">
          <h2 className="section-title">Giải pháp B2B</h2>
          <p className="section-description">
            ATTD phục vụ nhiều nhóm khách hàng doanh nghiệp khác nhau.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
              marginTop: "28px",
            }}
          >
            {[
              { href: "/nguon-hang", title: "Nguồn hàng sỉ", desc: "Kho sỉ trơn cho đại lý và xưởng in" },
              { href: "/oem", title: "OEM & Private Label", desc: "Hàng trơn gắn nhãn thương hiệu riêng" },
              { href: "/qua-tang-doanh-nghiep", title: "Quà tặng doanh nghiệp", desc: "Áo thun, tote, nón cho sự kiện DN" },
              { href: "/chinh-sach-dai-ly", title: "Chính sách đại lý", desc: "Quyền lợi và chính sách giá đại lý" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}
                >
                  {item.desc}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card">
            <h2 className="section-title">Trở thành đại lý ATTD</h2>

            <p className="section-description">
              Đăng ký tài khoản đại lý để nhận chính sách giá tốt hơn và cập nhật nguồn hàng mới nhất.
            </p>

            <div style={{ marginTop: "24px" }}>
              <TrackedLink
                href="/dai-ly"
                trackEvent="dealer_registration_click"
                trackSource="HOMEPAGE"
                className="btn-primary"
              >
                Đăng ký đại lý
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}