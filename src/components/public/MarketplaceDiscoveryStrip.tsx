import Link from "next/link";
import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

export type DiscoveryChip = {
  slug: string;
  name: string;
  imageUrl?: string | null;
  skuCount?: number;
};

type Props = {
  productCount: number;
  variantCount: number;
  categoryCount: number;
  chips: DiscoveryChip[];
};

export default function MarketplaceDiscoveryStrip({
  productCount,
  variantCount,
  categoryCount,
  chips,
}: Props) {
  return (
    <section className="hp-discovery">
      <div className="container">
        <div className="hp-discovery-inner">
          <div className="hp-discovery-copy">
            <h2 className="hp-discovery-title">
              Một nơi để tìm nguồn hàng đồng phục &amp; quà tặng
            </h2>
            <p className="hp-discovery-desc">
              Duyệt danh mục, xem biến thể màu/size, MOQ và lead-time — sau đó
              gửi yêu cầu báo giá sỉ phù hợp nhu cầu đại lý, agency hoặc doanh nghiệp.
            </p>
            <div className="hp-discovery-stats">
              {productCount > 0 && (
                <div className="hp-discovery-stat">
                  <span className="hp-discovery-stat-value">{productCount}</span>
                  <span className="hp-discovery-stat-label">sản phẩm đang mở</span>
                </div>
              )}
              {variantCount > 0 && (
                <div className="hp-discovery-stat">
                  <span className="hp-discovery-stat-value">{variantCount}+</span>
                  <span className="hp-discovery-stat-label">biến thể SKU</span>
                </div>
              )}
              {categoryCount > 0 && (
                <div className="hp-discovery-stat">
                  <span className="hp-discovery-stat-value">{categoryCount}</span>
                  <span className="hp-discovery-stat-label">danh mục B2B</span>
                </div>
              )}
            </div>
            <Link href="/san-pham" className="btn-primary hp-discovery-cta">
              Khám phá catalog sỉ
            </Link>
          </div>

          <div className="hp-discovery-chips" aria-label="Sản phẩm nổi bật">
            {chips.slice(0, 8).map((chip) => {
              const hasImg = chip.imageUrl && isValidImageSrc(chip.imageUrl);
              return (
                <Link
                  key={chip.slug}
                  href={`/san-pham/${chip.slug}`}
                  className="hp-discovery-chip"
                >
                  <div className="hp-discovery-chip-img">
                    {hasImg ? (
                      <Image
                        src={chip.imageUrl!}
                        alt={chip.name}
                        fill
                        className="hp-discovery-chip-photo"
                        sizes="80px"
                      />
                    ) : (
                      <div className="hp-discovery-chip-placeholder" aria-hidden>
                        ATTD
                      </div>
                    )}
                  </div>
                  <span className="hp-discovery-chip-name">{chip.name}</span>
                  {chip.skuCount != null && chip.skuCount > 0 && (
                    <span className="hp-discovery-chip-meta">{chip.skuCount} SKU</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
