/**
 * Sprint 19.0 — Centralized B2B product catalog.
 * Single source of truth for all seed product pages.
 * Edit this file to update product content; re-run seed to sync DB.
 */

import type { FaqItem } from "@/components/seo/FaqSchema";

export interface ProductCatalogItem {
  slug: string;
  sku: string;
  name: string;
  categorySlug: "ao-thun-tron" | "ao-polo-tron";
  categoryName: string;
  seoTitle: string;
  seoDescription: string;
  shortDescription: string;
  content: string;
  faqs: FaqItem[];
  imagePlaceholder: string | null;
}

export interface ProductInternalLink {
  href: string;
  label: string;
}

export const TSHIRT_INTERNAL_LINKS: ProductInternalLink[] = [
  { href: "/ao-thun-tron", label: "Danh mục áo thun trơn" },
  { href: "/kho-ao-thun-tron", label: "Kho áo thun trơn" },
  { href: "/ao-thun-tron-si", label: "Áo thun trơn sỉ" },
];

export const POLO_INTERNAL_LINKS: ProductInternalLink[] = [
  { href: "/ao-polo-tron", label: "Danh mục áo polo trơn" },
  { href: "/kho-ao-polo-tron", label: "Kho áo polo trơn" },
  { href: "/ao-polo-tron-si", label: "Áo polo trơn sỉ" },
];

export function getCatalogInternalLinks(
  categorySlug: ProductCatalogItem["categorySlug"]
): ProductInternalLink[] {
  return categorySlug === "ao-thun-tron"
    ? TSHIRT_INTERNAL_LINKS
    : POLO_INTERNAL_LINKS;
}

type ProductSeed = Omit<
  ProductCatalogItem,
  "categoryName" | "slug" | "sku" | "name" | "categorySlug" | "imagePlaceholder"
> & {
  imagePlaceholder?: string | null;
};

function tee(
  name: string,
  slug: string,
  sku: string,
  seed: ProductSeed
): ProductCatalogItem {
  return {
    slug,
    sku,
    name,
    categorySlug: "ao-thun-tron",
    categoryName: "Áo thun trơn",
    ...seed,
    imagePlaceholder: seed.imagePlaceholder ?? null,
  };
}

function polo(
  name: string,
  slug: string,
  sku: string,
  seed: ProductSeed
): ProductCatalogItem {
  return {
    slug,
    sku,
    name,
    categorySlug: "ao-polo-tron",
    categoryName: "Áo polo trơn",
    ...seed,
    imagePlaceholder: seed.imagePlaceholder ?? null,
  };
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  tee("Áo thun Cotton Basic", "ao-thun-cotton-basic", "AT-CAT-01", {
    seoTitle: "Áo Thun Cotton Basic Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun cotton basic trơn — nguồn hàng blank cho đại lý, xưởng in và doanh nghiệp. Phù hợp in ấn, thêu logo và đồng phục. Liên hệ báo giá.",
    shortDescription:
      "Áo thun cotton basic trơn — dòng blank phổ biến cho xưởng in, đại lý đồng phục và doanh nghiệp cần nguồn hàng linh hoạt.",
    content: `Áo thun cotton basic là lựa chọn blank phổ biến nhất trong phân khúc áo thun trơn B2B — phù hợp đại lý đồng phục, xưởng in, xưởng thêu, agency và doanh nghiệp cần nguồn hàng ổn định với chi phí hợp lý. Đây là dòng sản phẩm nền tảng để triển khai các đơn in logo, thêu thương hiệu và đồng phục theo yêu cầu.

Với chất liệu cotton, áo mang cảm giác mặc tự nhiên và thoải mái — phù hợp sử dụng hàng ngày trong môi trường doanh nghiệp, sự kiện nội bộ và các chương trình quảng bá thương hiệu. Bề mặt vải trơn thuận lợi cho in ấn và thêu logo theo file thiết kế của khách hàng.

Ứng dụng phổ biến: đồng phục nhân viên, áo sự kiện, quà tặng doanh nghiệp, hàng trơn cho xưởng in nhận đơn gia công và nguồn hàng cho đại lý phân phối. Sản phẩm có thể tùy chỉnh theo nhu cầu về màu sắc, size và phương án gia công.

ATTD cung cấp nguồn áo thun cotton basic trơn với định hướng B2B — hỗ trợ đại lý, xưởng in và doanh nghiệp có nhu cầu blank apparel và wholesale apparel. Liên hệ để nhận tư vấn nguồn hàng, báo giá và phương án hợp tác phù hợp quy mô đơn hàng.`,
    faqs: [
      { question: "Áo thun cotton basic có phù hợp in logo doanh nghiệp không?", answer: "Có. Bề mặt trơn phù hợp in ấn và thêu logo theo yêu cầu. ATTD hỗ trợ tư vấn phương án gia công phù hợp từng đơn hàng." },
      { question: "Ai thường đặt dòng cotton basic?", answer: "Đại lý đồng phục, xưởng in, xưởng thêu, agency và doanh nghiệp cần nguồn blank giá tối ưu cho đơn số lượng vừa và lớn." },
      { question: "Có thể tùy chỉnh màu và size không?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ ATTD để xác nhận bảng màu và size phù hợp từng đơn." },
      { question: "Cotton basic dùng cho loại đơn hàng nào?", answer: "Phù hợp đồng phục, sự kiện, quà tặng thương hiệu và hàng trơn cho xưởng gia công in/thêu." },
      { question: "Làm sao nhận báo giá cotton basic?", answer: "Liên hệ ATTD qua form đại lý hoặc hotline. Báo giá theo số lượng, màu sắc và yêu cầu gia công cụ thể." },
    ],
  }),
  tee("Áo thun Cotton Premium", "ao-thun-cotton-premium", "AT-CAT-02", {
    seoTitle: "Áo Thun Cotton Premium Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun cotton premium trơn — nguồn blank cao cấp cho đồng phục doanh nghiệp và xưởng thêu. Phù hợp in ấn và thêu logo. Báo giá B2B.",
    shortDescription:
      "Áo thun cotton premium trơn — dòng blank chất lượng cao hơn, phù hợp thương hiệu và đồng phục doanh nghiệp chú trọng hình ảnh.",
    content: `Áo thun cotton premium là dòng blank nâng cấp trong phân khúc cotton trơn — hướng tới đại lý đồng phục, xưởng thêu và doanh nghiệp cần chất lượng vải và hoàn thiện tốt hơn mức basic. Phù hợp các đơn đồng phục dài hạn, thương hiệu chú trọng trải nghiệm mặc và chương trình quà tặng cao cấp.

Bề mặt vải trơn, mịn hơn — thuận lợi cho thêu logo mật độ cao và in ấn sắc nét. Sản phẩm phù hợp sử dụng trong môi trường công sở, dịch vụ và các thương hiệu muốn nâng cấp hình ảnh đồng phục so với dòng basic.

Ứng dụng: đồng phục nhân viên, quà tặng doanh nghiệp, merchandise thương hiệu và blank cho xưởng thêu nhận đơn premium. Có thể tùy chỉnh theo nhu cầu về màu, size và phương án gia công in/thêu.

ATTD cung cấp nguồn áo thun cotton premium trơn theo mô hình B2B sourcing — phục vụ đại lý, agency và doanh nghiệp trên toàn quốc. Liên hệ để nhận tư vấn và báo giá wholesale.`,
    faqs: [
      { question: "Cotton premium khác cotton basic thế nào?", answer: "Premium hướng tới chất lượng vải và hoàn thiện cao hơn, phù hợp thương hiệu và đồng phục dài hạn. Basic tối ưu chi phí cho đơn số lượng lớn." },
      { question: "Dòng premium có phù hợp thêu logo không?", answer: "Có. Bề mặt trơn phù hợp thêu logo và in ấn theo yêu cầu doanh nghiệp." },
      { question: "Doanh nghiệp nào nên chọn cotton premium?", answer: "Doanh nghiệp, agency và đại lý phục vụ khách hàng chú trọng chất lượng đồng phục và hình ảnh thương hiệu." },
      { question: "Có hỗ trợ gửi mẫu trước khi đặt hàng không?", answer: "Có thể hỗ trợ gửi mẫu tùy từng đơn và đối tác. Liên hệ ATTD để trao đổi." },
      { question: "Premium có trong kho áo thun trơn không?", answer: "Có. Xem thêm kho áo thun trơn và liên hệ xác nhận màu, size phù hợp nhu cầu." },
    ],
  }),
  tee("Áo thun Cotton Heavyweight", "ao-thun-cotton-heavyweight", "AT-CAT-03", {
    seoTitle: "Áo Thun Cotton Heavyweight Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun cotton heavyweight trơn sỉ — dòng blank dày, form đứng, phù hợp thêu logo và đồng phục. Nguồn hàng B2B từ ATTD.",
    shortDescription:
      "Áo thun cotton heavyweight trơn — dòng blank dày, form đứng, phù hợp thêu logo và đồng phục doanh nghiệp dài hạn.",
    content: `Áo thun cotton heavyweight là dòng blank cotton với cảm giác vải dày và form đứng hơn — phù hợp đại lý đồng phục, xưởng thêu và doanh nghiệp cần sản phẩm bền và có presence khi mặc. Đây là lựa chọn phổ biến cho đồng phục mặc lặp lại và thương hiệu muốn chất lượng vải nổi bật.

Vải cotton trơn, bề mặt phẳng — thuận lợi cho thêu logo và in ấn. Form đứng giúp silhouette chuyên nghiệp, phù hợp môi trường doanh nghiệp và các chương trình thương hiệu cần hình ảnh vững chắc.

Ứng dụng: đồng phục nhân viên, quà tặng doanh nghiệp, merchandise thương hiệu và blank cho xưởng thêu. Có thể tùy chỉnh theo nhu cầu về màu, size và gia công.

ATTD cung cấp nguồn cotton heavyweight trơn theo mô hình wholesale apparel — liên hệ báo giá và tư vấn nguồn hàng cho đại lý, xưởng in và doanh nghiệp.`,
    faqs: [
      { question: "Heavyweight phù hợp loại khách hàng nào?", answer: "Đại lý đồng phục, xưởng thêu và doanh nghiệp cần áo dày, form đứng cho đồng phục dài hạn." },
      { question: "Có phù hợp thêu logo mật độ cao không?", answer: "Có. Vải dày hơn thường cho bề mặt thêu phẳng hơn. Liên hệ tư vấn phương án thêu phù hợp." },
      { question: "Heavyweight dùng cho sự kiện ngoài trời được không?", answer: "Tùy thời tiết và yêu cầu mặc. Liên hệ ATTD để được tư vấn dòng phù hợp từng mục đích." },
      { question: "Khác gì so với cotton basic?", answer: "Heavyweight cho cảm giác dày và form đứng hơn. Basic nhẹ hơn, tối ưu chi phí cho đơn số lượng lớn." },
      { question: "Làm sao đặt hàng cotton heavyweight?", answer: "Liên hệ ATTD qua form đại lý hoặc hotline. Cung cấp số lượng, màu và yêu cầu gia công để nhận báo giá." },
    ],
  }),
  tee("Áo thun CVC Basic", "ao-thun-cvc-basic", "AT-CAT-04", {
    seoTitle: "Áo Thun CVC Basic Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun CVC basic trơn sỉ — nguồn blank cân bằng chất lượng và giá cho đại lý và xưởng in. Phù hợp in ấn, thêu logo, đồng phục.",
    shortDescription:
      "Áo thun CVC basic trơn — dòng blank phổ biến, cân bằng chất lượng và chi phí, phù hợp đồng phục và in ấn số lượng lớn.",
    content: `Áo thun CVC basic là dòng blank được xưởng in và đại lý đồng phục lựa chọn nhiều — cân bằng giữa cảm giác mặc, độ bền form và chi phí. Phù hợp nguồn hàng cho đại lý, xưởng in, xưởng thêu, agency và doanh nghiệp cần blank apparel với ngân sách linh hoạt.

Vải CVC trơn, bề mặt phẳng — thuận lợi in ấn và thêu logo theo yêu cầu. Sản phẩm phù hợp đồng phục nhân viên, sự kiện doanh nghiệp và hàng trơn cho xưởng gia công nhận đơn từ khách hàng cuối.

Có thể tùy chỉnh theo nhu cầu về màu sắc, size và phương án in/thêu. ATTD hỗ trợ tư vấn nguồn hàng CVC basic trơn theo mô hình B2B sourcing và wholesale apparel.

Liên hệ để nhận báo giá, bảng màu và phương án hợp tác phù hợp quy mô — từ đơn vừa đến đơn lớn cho đại lý và doanh nghiệp.`,
    faqs: [
      { question: "CVC basic phù hợp in lụa số lượng lớn không?", answer: "Có. Bề mặt trơn phù hợp in ấn theo quy mô đơn hàng. Liên hệ tư vấn phương án in phù hợp." },
      { question: "Ai thường nhập CVC basic?", answer: "Xưởng in, đại lý đồng phục, agency và doanh nghiệp cần nguồn blank cân bằng giá và chất lượng." },
      { question: "CVC basic có dùng cho đồng phục dài hạn không?", answer: "Có. Phù hợp đồng phục mặc lặp lại khi doanh nghiệp cần cân bằng chi phí và độ bền." },
      { question: "Có thể mix nhiều màu trong một đơn không?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ ATTD để xác nhận phương án tối ưu." },
      { question: "CVC basic nằm trong kho áo thun trơn không?", answer: "Có. Xem trang kho áo thun trơn hoặc liên hệ xác nhận màu và size hiện có." },
    ],
  }),
  tee("Áo thun CVC Premium", "ao-thun-cvc-premium", "AT-CAT-05", {
    seoTitle: "Áo Thun CVC Premium Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun CVC premium trơn sỉ — dòng blank chất lượng cao hơn CVC basic. Nguồn hàng cho đồng phục doanh nghiệp và xưởng thêu.",
    shortDescription:
      "Áo thun CVC premium trơn — nâng cấp từ CVC basic, phù hợp đồng phục doanh nghiệp và thêu logo chất lượng cao.",
    content: `Áo thun CVC premium là phiên bản nâng cấp trong dòng CVC trơn — hướng tới đại lý đồng phục và doanh nghiệp cần chất lượng vải và hoàn thiện tốt hơn basic mà vẫn giữ mức giá cạnh tranh trong phân khúc blank apparel.

Bề mặt trơn, mịn hơn — phù hợp thêu logo và in ấn sắc nét. Sản phẩm phù hợp đồng phục nhân viên, thương hiệu dịch vụ và các chương trình doanh nghiệp chú trọng hình ảnh chuyên nghiệp.

Ứng dụng: đồng phục, quà tặng thương hiệu, hàng trơn cho xưởng thêu in và nguồn hàng cho đại lý. Có thể tùy chỉnh theo nhu cầu về màu, size và gia công.

ATTD cung cấp CVC premium trơn theo mô hình B2B — liên hệ báo giá wholesale và tư vấn nguồn hàng cho đại lý, xưởng in và doanh nghiệp.`,
    faqs: [
      { question: "CVC premium khác CVC basic?", answer: "Premium hướng tới chất lượng và hoàn thiện cao hơn basic. Basic tối ưu chi phí cho đơn số lượng lớn." },
      { question: "Premium có phù hợp thêu logo doanh nghiệp?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo yêu cầu. Liên hệ tư vấn phương án gia công." },
      { question: "Doanh nghiệp nào chọn CVC premium?", answer: "Doanh nghiệp và đại lý phục vụ khách hàng cần đồng phục chất lượng cao hơn mức basic." },
      { question: "Có thể đặt hàng mix size cho đồng phục?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ ATTD với bảng phân bổ size cụ thể." },
      { question: "Nhận báo giá CVC premium như thế nào?", answer: "Liên hệ qua form đại lý hoặc hotline. Báo giá theo số lượng và yêu cầu gia công." },
    ],
  }),
  tee("Áo thun TC Basic", "ao-thun-tc-basic", "AT-CAT-06", {
    seoTitle: "Áo Thun TC Basic Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun TC basic trơn sỉ — nguồn blank giá tối ưu cho sự kiện và đơn số lượng lớn. Phù hợp in ấn, đại lý và xưởng in.",
    shortDescription:
      "Áo thun TC basic trơn — dòng blank giá tối ưu, phù hợp sự kiện, activation và đơn số lượng lớn cho xưởng in.",
    content: `Áo thun TC basic là dòng blank hướng tới chi phí tối ưu — phù hợp xưởng in, agency event, đại lý và doanh nghiệp cần nguồn hàng cho sự kiện quảng bá, activation thương hiệu và các chương trình ngắn hạn.

Vải trơn, bề mặt phẳng — thuận lợi in ấn theo thiết kế khách hàng. Sản phẩm phù hợp hàng trơn cho xưởng gia công nhận đơn từ doanh nghiệp và agency, cũng như đơn đồng phục cần tối ưu ngân sách.

Có thể tùy chỉnh theo nhu cầu về màu sắc, size và phương án in ấn. ATTD cung cấp nguồn TC basic trơn theo mô hình B2B sourcing — liên hệ báo giá wholesale và tư vấn phương án phù hợp quy mô đơn hàng.

Phù hợp đại lý, xưởng in, agency và doanh nghiệp cần blank apparel với ưu tiên chi phí đơn vị.`,
    faqs: [
      { question: "TC basic phù hợp đơn sự kiện không?", answer: "Có. Dòng này thường được chọn cho sự kiện, activation và quà tặng khuyến mãi cần tối ưu ngân sách." },
      { question: "Có in logo trên TC basic được không?", answer: "Có. Bề mặt trơn phù hợp in ấn theo yêu cầu. Liên hệ tư vấn phương án in phù hợp." },
      { question: "Ai thường nhập TC basic?", answer: "Xưởng in, agency event, đại lý và doanh nghiệp cần blank giá tốt cho đơn số lượng lớn." },
      { question: "TC basic khác CVC basic?", answer: "TC basic hướng tới chi phí tối ưu hơn. CVC basic cân bằng chất lượng mặc và giá cho đồng phục dài hạn hơn." },
      { question: "Làm sao đặt TC basic số lượng lớn?", answer: "Liên hệ ATTD với số lượng, màu và timeline. Nhận báo giá và phương án giao hàng phù hợp." },
    ],
  }),
  tee("Áo thun Oversize Basic", "ao-thun-oversize-basic", "AT-CAT-07", {
    seoTitle: "Áo Thun Oversize Basic Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun oversize basic trơn sỉ — form rộng, phù hợp in thiết kế lớn và thương hiệu. Nguồn blank B2B từ ATTD.",
    shortDescription:
      "Áo thun oversize basic trơn — form rộng, phù hợp thương hiệu, in graphic lớn và đơn hàng đặc biệt cho agency.",
    content: `Áo thun oversize basic là dòng blank form rộng — phù hợp thương hiệu, agency sáng tạo, xưởng in và đại lý phục vụ phân khúc cần silhouette thoải mái và không gian in thiết kế lớn phía trước hoặc sau áo.

Form oversize tạo diện mạo hiện đại, phù hợp merchandise thương hiệu, chương trình pop-up và các dự án in ấn cần bề mặt rộng. Bề mặt vải trơn thuận lợi in ấn và thêu logo theo yêu cầu.

Ứng dụng: merchandise thương hiệu, collab giới hạn, hàng trơn cho xưởng in và nguồn hàng cho đại lý. Có thể tùy chỉnh theo nhu cầu về màu, size và gia công.

ATTD cung cấp oversize basic trơn theo mô hình B2B — liên hệ tư vấn bảng size, báo giá và phương án hợp tác cho đại lý, xưởng in và agency.`,
    faqs: [
      { question: "Oversize basic khác regular fit?", answer: "Oversize có form rộng hơn, phù hợp thương hiệu và in graphic lớn. Regular fit phù hợp đồng phục truyền thống." },
      { question: "Có phù hợp in thiết kế full-front không?", answer: "Form rộng tạo không gian in lớn — phù hợp thiết kế graphic phía trước và sau áo. Liên hệ tư vấn kỹ thuật in." },
      { question: "Ai thường đặt oversize basic?", answer: "Agency sáng tạo, thương hiệu, xưởng in và đại lý phục vụ phân khúc streetwear và merchandise." },
      { question: "Có bảng size oversize không?", answer: "Có. Liên hệ ATTD để nhận bảng size và tư vấn phân bổ phù hợp từng đơn." },
      { question: "Oversize basic có thêu logo được không?", answer: "Có. Phù hợp thêu logo và in ấn theo yêu cầu. Liên hệ tư vấn phương án gia công." },
    ],
  }),
  tee("Áo thun Oversize Premium", "ao-thun-oversize-premium", "AT-CAT-08", {
    seoTitle: "Áo Thun Oversize Premium Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun oversize premium trơn sỉ — form rộng cao cấp, phù hợp thương hiệu premium và in thiết kế lớn. Nguồn B2B.",
    shortDescription:
      "Áo thun oversize premium trơn — form rộng cao cấp, phù hợp thương hiệu premium, in graphic và merchandise chất lượng.",
    content: `Áo thun oversize premium nâng cấp trải nghiệm form rộng với chất lượng vải và hoàn thiện cao hơn basic — phù hợp thương hiệu premium, agency sáng tạo và xưởng in nhận đơn merchandise chất lượng.

Form oversize kết hợp bề mặt trơn, mịn — thuận lợi in ấn thiết kế phức tạp và thêu logo theo yêu cầu. Sản phẩm phù hợp pop-up giới hạn, collab thương hiệu và các dự án cần hình ảnh nổi bật.

Có thể tùy chỉnh theo nhu cầu về màu, size và phương án gia công. ATTD hỗ trợ đại lý, xưởng in và agency có nhu cầu oversize premium trơn trong phân khúc blank apparel.

Liên hệ báo giá wholesale và tư vấn nguồn hàng phù hợp quy mô dự án.`,
    faqs: [
      { question: "Oversize premium khác oversize basic?", answer: "Premium có chất lượng vải và hoàn thiện cao hơn basic. Basic tối ưu chi phí cho đơn số lượng lớn." },
      { question: "Premium phù hợp thương hiệu nào?", answer: "Thương hiệu, agency và đại lý phục vụ phân khúc premium cần form rộng và chất lượng cao." },
      { question: "Có thêu patch trên oversize premium không?", answer: "Có thể tùy chỉnh theo yêu cầu gia công. Liên hệ ATTD tư vấn phương án thêu/in phù hợp." },
      { question: "Nhận mẫu oversize premium trước khi đặt?", answer: "Có thể hỗ trợ gửi mẫu tùy đối tác và đơn hàng. Liên hệ trao đổi." },
      { question: "Đặt oversize premium qua kênh nào?", answer: "Liên hệ ATTD qua form đại lý, hotline hoặc trang liên hệ báo giá." },
    ],
  }),
  tee("Áo thun Unisex", "ao-thun-unisex", "AT-CAT-09", {
    seoTitle: "Áo Thun Unisex Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun unisex trơn sỉ — form trung tính, đa dụng cho đồng phục hỗn hợp. Nguồn blank B2B cho đại lý và doanh nghiệp.",
    shortDescription:
      "Áo thun unisex trơn — form trung tính đa dụng, phù hợp đồng phục nam nữ và đơn hàng đa size cho doanh nghiệp.",
    content: `Áo thun unisex là dòng blank form trung tính — phù hợp đơn đồng phục hỗn hợp giới tính, sự kiện doanh nghiệp và nguồn hàng cho đại lý cần sản phẩm đa dụng, dễ phân phối size.

Bề mặt vải trơn phù hợp in ấn và thêu logo theo yêu cầu. Form unisex giúp đơn giản hóa quản lý size khi doanh nghiệp đặt đồng phục cho đội ngũ đa dạng.

Ứng dụng: đồng phục nhân viên, sự kiện nội bộ, quà tặng thương hiệu và hàng trơn cho xưởng in thêu. Có thể tùy chỉnh theo nhu cầu về màu, size và gia công.

ATTD cung cấp unisex trơn theo mô hình B2B sourcing — liên hệ báo giá và tư vấn nguồn hàng cho đại lý, xưởng in và doanh nghiệp.`,
    faqs: [
      { question: "Unisex khác regular fit?", answer: "Unisex có form trung tính hơn, phù hợp đơn nam nữ trong cùng một bảng size. Regular fit thường theo form nam truyền thống." },
      { question: "Unisex phù hợp đồng phục công ty?", answer: "Có. Thường được chọn khi doanh nghiệp cần một dòng áo cho toàn bộ nhân sự đa dạng vóc dáng." },
      { question: "Có đủ size cho đơn lớn không?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ ATTD xác nhận bảng size phù hợp từng đơn." },
      { question: "Unisex có in logo được không?", answer: "Có. Bề mặt trơn phù hợp in ấn và thêu logo theo file thiết kế." },
      { question: "Đại lý đăng ký nhập unisex thế nào?", answer: "Đăng ký qua trang đại lý hoặc liên hệ trực tiếp ATTD để nhận chính sách và báo giá." },
    ],
  }),
  tee("Áo thun Blank Export", "ao-thun-blank-export", "AT-CAT-10", {
    seoTitle: "Áo Thun Blank Export Trơn Sỉ | ATTD",
    seoDescription:
      "Áo thun blank export trơn sỉ — nguồn blank cho đại lý xuất khẩu và OEM. Phù hợp in ấn, thêu logo, đồng phục doanh nghiệp.",
    shortDescription:
      "Áo thun blank export trơn — dòng blank cho đại lý xuất khẩu, OEM và đơn hàng cần nguồn hàng ổn định, có thể tùy chỉnh.",
    content: `Áo thun blank export là dòng blank hướng tới đại lý xuất khẩu, công ty trading, xưởng gia công và doanh nghiệp cần nguồn hàng trơn ổn định cho đơn lặp lại hoặc phân phối quốc tế.

Sản phẩm phù hợp in ấn, thêu logo và gia công theo yêu cầu khách hàng. Có thể tùy chỉnh theo nhu cầu về màu sắc, size, tem mác và phương án đóng gói — liên hệ ATTD trao đổi chi tiết từng đơn.

Ứng dụng: OEM/ODM, phân phối đại lý, xuất khẩu và hàng trơn cho xưởng in thêu. ATTD hỗ trợ tư vấn nguồn hàng blank export theo mô hình B2B sourcing.

Liên hệ báo giá, phương án hợp tác và timeline phù hợp quy mô xuất khẩu hoặc phân phối nội địa.`,
    faqs: [
      { question: "Blank export khác dòng thun thường?", answer: "Blank export hướng tới đơn lặp lại, xuất khẩu và OEM — hỗ trợ tùy chỉnh tem mác, đóng gói theo yêu cầu." },
      { question: "Có hỗ trợ tem mác và đóng gói không?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ ATTD trao đổi chi tiết từng đơn xuất khẩu." },
      { question: "Ai thường đặt blank export?", answer: "Đại lý xuất khẩu, công ty trading, xưởng gia công FOB và doanh nghiệp cần nguồn blank ổn định." },
      { question: "Blank export có in/thêu được không?", answer: "Có. Phù hợp in ấn và thêu logo theo yêu cầu. Liên hệ tư vấn phương án gia công." },
      { question: "Trao đổi đơn xuất khẩu qua kênh nào?", answer: "Liên hệ ATTD trực tiếp với thông tin số lượng, màu, timeline và yêu cầu xuất khẩu cụ thể." },
    ],
  }),
  polo("Áo Polo Basic", "ao-polo-basic", "AP-CAT-01", {
    seoTitle: "Áo Polo Basic Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo basic trơn sỉ — nguồn blank polo giá tối ưu cho đại lý và xưởng thêu. Phù hợp đồng phục, in ấn và thêu logo.",
    shortDescription:
      "Áo polo basic trơn — dòng blank polo phổ biến, phù hợp đồng phục ngân sách và nguồn hàng cho xưởng thêu in.",
    content: `Áo polo basic là dòng blank polo nền tảng trong kho áo polo trơn — phù hợp đại lý đồng phục, xưởng thêu, xưởng in, agency và doanh nghiệp cần nguồn hàng polo trơn với chi phí hợp lý.

Bề mặt trơn phù hợp thêu logo ngực trái, in ấn và heat transfer theo yêu cầu. Sản phẩm phù hợp đồng phục nhân viên F&B, bán lẻ, logistics và sự kiện doanh nghiệp.

Có thể tùy chỉnh theo nhu cầu về màu sắc, size và phương án gia công. ATTD cung cấp polo basic trơn theo mô hình B2B sourcing và wholesale apparel.

Liên hệ báo giá và tư vấn nguồn hàng cho đại lý, xưởng thêu in và doanh nghiệp.`,
    faqs: [
      { question: "Polo basic có thêu logo được không?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo yêu cầu. Liên hệ tư vấn phương án thêu phù hợp." },
      { question: "Ai thường nhập polo basic?", answer: "Đại lý đồng phục, xưởng thêu in, doanh nghiệp và agency cần blank polo giá tối ưu." },
      { question: "Polo basic dùng cho đồng phục dài hạn?", answer: "Phù hợp đồng phục khi doanh nghiệp cần cân bằng ngân sách. Liên hệ tư vấn dòng phù hợp từng mục đích." },
      { question: "Có trong kho áo polo trơn không?", answer: "Có. Xem trang kho áo polo trơn hoặc liên hệ xác nhận màu và size." },
      { question: "Nhận báo giá polo basic?", answer: "Liên hệ ATTD qua form đại lý hoặc hotline với số lượng và yêu cầu gia công." },
    ],
  }),
  polo("Áo Polo Premium", "ao-polo-premium", "AP-CAT-02", {
    seoTitle: "Áo Polo Premium Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo premium trơn sỉ — dòng blank polo cao cấp cho đồng phục doanh nghiệp. Phù hợp thêu logo và thương hiệu.",
    shortDescription:
      "Áo polo premium trơn — dòng blank polo cao cấp, phù hợp đồng phục doanh nghiệp và thương hiệu chú trọng hình ảnh.",
    content: `Áo polo premium là dòng blank polo nâng cấp — hướng tới đại lý đồng phục, doanh nghiệp và thương hiệu cần chất lượng vải và hoàn thiện cao hơn basic. Phù hợp đồng phục cấp quản lý, dịch vụ cao cấp và chương trình thương hiệu chuyên nghiệp.

Bề mặt trơn, mịn — thuận lợi thêu logo mật độ cao và in ấn sắc nét. Sản phẩm phù hợp môi trường công sở, khách sạn, resort và các thương hiệu F&B premium.

Có thể tùy chỉnh theo nhu cầu về màu, size và gia công. ATTD cung cấp polo premium trơn theo mô hình B2B — liên hệ báo giá wholesale.`,
    faqs: [
      { question: "Polo premium khác polo basic?", answer: "Premium có chất lượng và hoàn thiện cao hơn basic. Basic tối ưu chi phí cho đơn số lượng lớn." },
      { question: "Premium phù hợp thêu logo doanh nghiệp?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo yêu cầu. Liên hệ tư vấn phương án gia công." },
      { question: "Doanh nghiệp nào chọn polo premium?", answer: "Doanh nghiệp, đại lý và agency phục vụ khách hàng cần đồng phục polo cao cấp." },
      { question: "Có gửi mẫu polo premium?", answer: "Có thể hỗ trợ gửi mẫu tùy đối tác. Liên hệ ATTD trao đổi." },
      { question: "Polo premium trong danh mục nào?", answer: "Thuộc kho áo polo trơn. Xem danh mục áo polo trơn hoặc liên hệ báo giá." },
    ],
  }),
  polo("Áo Polo CVC", "ao-polo-cvc", "AP-CAT-03", {
    seoTitle: "Áo Polo CVC Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo CVC trơn sỉ — nguồn blank polo cân bằng chất lượng và giá. Phù hợp đồng phục, thêu logo cho đại lý và doanh nghiệp.",
    shortDescription:
      "Áo polo CVC trơn — dòng blank polo phổ biến, cân bằng chất lượng mặc và chi phí cho đồng phục doanh nghiệp.",
    content: `Áo polo CVC là dòng blank polo được đại lý đồng phục lựa chọn nhiều — cân bằng cảm giác mặc, độ bền form và chi phí. Phù hợp nguồn hàng cho xưởng thêu in, agency và doanh nghiệp cần polo trơn cho đồng phục hàng ngày.

Bề mặt trơn phù hợp thêu logo, in ấn và heat transfer. Sản phẩm phù hợp F&B, bán lẻ, logistics và văn phòng doanh nghiệp.

Có thể tùy chỉnh theo nhu cầu về màu, size và gia công. ATTD cung cấp polo CVC trơn theo mô hình B2B sourcing — liên hệ báo giá và tư vấn nguồn hàng.`,
    faqs: [
      { question: "Polo CVC phù hợp đồng phục công ty?", answer: "Có. Thường được chọn cho đồng phục nhân viên cần cân bằng chất lượng và ngân sách." },
      { question: "CVC có thêu logo tay áo được không?", answer: "Có thể tùy chỉnh theo yêu cầu gia công. Liên hệ ATTD tư vấn vị trí thêu phù hợp." },
      { question: "Polo CVC khác polo cotton?", answer: "CVC cân bằng chi phí và bền form. Cotton hướng tới cảm giác mặc tự nhiên hơn. Liên hệ tư vấn dòng phù hợp." },
      { question: "Đại lý nhập polo CVC thế nào?", answer: "Đăng ký qua trang đại lý hoặc liên hệ trực tiếp ATTD để nhận chính sách và báo giá." },
      { question: "Có mix màu trong một đơn polo CVC?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ xác nhận phương án tối ưu." },
    ],
  }),
  polo("Áo Polo Cotton", "ao-polo-cotton", "AP-CAT-04", {
    seoTitle: "Áo Polo Cotton Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo cotton trơn sỉ — nguồn blank polo cotton cho đồng phục cao cấp. Phù hợp thêu logo và doanh nghiệp.",
    shortDescription:
      "Áo polo cotton trơn — dòng blank polo cotton, phù hợp đồng phục cao cấp và thêu logo chất lượng.",
    content: `Áo polo cotton là dòng blank polo hướng tới cảm giác mặc tự nhiên và thoải mái — phù hợp đại lý đồng phục, doanh nghiệp và thương hiệu chú trọng chất liệu cotton trong đồng phục polo.

Bề mặt trơn thuận lợi thêu logo và in ấn theo yêu cầu. Phù hợp golf club, resort, khách sạn và đồng phục doanh nghiệp cao cấp.

Có thể tùy chỉnh theo nhu cầu về màu, size và gia công. ATTD cung cấp polo cotton trơn theo mô hình wholesale apparel — liên hệ báo giá B2B.`,
    faqs: [
      { question: "Polo cotton phù hợp khách sạn/resort?", answer: "Có. Thường được chọn khi thương hiệu cần cảm giác mặc cotton cao cấp trong đồng phục polo." },
      { question: "Cotton có thêu logo mật độ cao?", answer: "Bề mặt trơn phù hợp thêu logo theo yêu cầu. Liên hệ tư vấn phương án thêu phù hợp." },
      { question: "Polo cotton khác polo CVC?", answer: "Cotton hướng tới cảm giác mặc tự nhiên. CVC cân bằng chi phí và bền form. Liên hệ tư vấn dòng phù hợp." },
      { question: "Có mẫu polo cotton không?", answer: "Có thể hỗ trợ gửi mẫu tùy đối tác. Liên hệ ATTD trao đổi." },
      { question: "Báo giá polo cotton?", answer: "Liên hệ ATTD với số lượng, màu và yêu cầu gia công để nhận báo giá." },
    ],
  }),
  polo("Áo Polo Trơn", "ao-polo-tron-san-pham", "AP-CAT-05", {
    seoTitle: "Áo Polo Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo trơn sỉ — nguồn blank polo cho đại lý, xưởng thêu và doanh nghiệp. Phù hợp in ấn, thêu logo và đồng phục.",
    shortDescription:
      "Áo polo trơn — dòng blank polo đa dụng, phù hợp đồng phục, in ấn và nguồn hàng cho đại lý đồng phục.",
    content: `Áo polo trơn là dòng blank polo đa dụng trong kho áo polo trơn — phù hợp đại lý đồng phục, xưởng thêu in, agency và doanh nghiệp cần nguồn hàng polo blank linh hoạt cho nhiều loại đơn hàng.

Bề mặt trơn phù hợp thêu logo, in ấn và heat transfer theo file thiết kế. Sản phẩm phù hợp đồng phục nhân viên, sự kiện doanh nghiệp và hàng trơn cho xưởng gia công.

Có thể tùy chỉnh theo nhu cầu về màu sắc, size và phương án gia công. ATTD cung cấp polo trơn theo mô hình B2B sourcing — nguồn hàng cho đại lý và wholesale apparel.

Liên hệ báo giá và tư vấn phương án hợp tác phù hợp quy mô.`,
    faqs: [
      { question: "Polo trơn dùng cho loại đơn nào?", answer: "Đồng phục, sự kiện, hàng trơn cho xưởng thêu in và nguồn hàng cho đại lý phân phối." },
      { question: "Có phù hợp in logo không?", answer: "Có. Bề mặt trơn phù hợp in ấn và thêu logo theo yêu cầu." },
      { question: "Polo trơn khác polo basic?", answer: "Polo trơn là dòng đa dụng trong danh mục polo blank. Basic tối ưu chi phí. Liên hệ tư vấn dòng phù hợp." },
      { question: "Xem thêm thông tin kho polo?", answer: "Truy cập trang kho áo polo trơn hoặc áo polo trơn sỉ để tìm hiểu thêm." },
      { question: "Liên hệ báo giá polo trơn?", answer: "Qua form đại lý, hotline hoặc trang liên hệ trên ATTD.vn." },
    ],
  }),
  polo("Áo Polo Đồng Phục", "ao-polo-dong-phuc", "AP-CAT-06", {
    seoTitle: "Áo Polo Đồng Phục Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo đồng phục trơn sỉ — nguồn blank polo cho đồng phục nhân viên. Phù hợp thêu logo, đại lý và doanh nghiệp.",
    shortDescription:
      "Áo polo đồng phục trơn — dòng blank polo tối ưu cho đồng phục nhân viên, thêu logo và đơn hàng doanh nghiệp.",
    content: `Áo polo đồng phục là dòng blank polo được thiết kế hướng tới nhu cầu đồng phục nhân viên — phù hợp đại lý đồng phục, doanh nghiệp, ngân hàng, bán lẻ, F&B và logistics cần polo trơn cho đội ngũ mặc hàng ngày.

Bề mặt trơn phù hợp thêu logo doanh nghiệp ngực trái, tay áo và in ấn theo guideline thương hiệu. Có thể tùy chỉnh theo nhu cầu về màu corporate, size và gia công trọn gói.

ATTD hỗ trợ nguồn hàng polo đồng phục trơn và tư vấn phương án gia công — liên hệ báo giá B2B cho đại lý, xưởng thêu in và doanh nghiệp.`,
    faqs: [
      { question: "Polo đồng phục có hỗ trợ thêu logo trọn gói?", answer: "Có thể tùy chỉnh theo yêu cầu gia công. Liên hệ ATTD trao đổi phương án thêu/in kèm blank." },
      { question: "Phù hợp đồng phục ngân hàng/công ty?", answer: "Có. Thường được chọn cho đồng phục nhân viên cần hình ảnh chuyên nghiệp." },
      { question: "Có màu corporate không?", answer: "Có thể tùy chỉnh theo nhu cầu. Liên hệ xác nhận bảng màu phù hợp từng đơn." },
      { question: "Timeline đơn đồng phục polo?", answer: "Tùy số lượng, màu và gia công. Liên hệ ATTD lên timeline cụ thể." },
      { question: "Đại lý đặt polo đồng phục thế nào?", answer: "Đăng ký đại lý hoặc liên hệ trực tiếp với thông tin đơn hàng cụ thể." },
    ],
  }),
  polo("Áo Polo Doanh Nghiệp", "ao-polo-doanh-nghiep", "AP-CAT-07", {
    seoTitle: "Áo Polo Doanh Nghiệp Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo doanh nghiệp trơn sỉ — nguồn blank polo cho corporate uniform. Phù hợp thêu logo, đại lý và agency.",
    shortDescription:
      "Áo polo doanh nghiệp trơn — dòng blank polo cho corporate uniform, thêu logo và chương trình thương hiệu B2B.",
    content: `Áo polo doanh nghiệp là dòng blank polo hướng tới thị trường corporate — phù hợp doanh nghiệp, đại lý đồng phục, agency và xưởng thêu in phục vụ khách hàng doanh nghiệp cần polo trơn chuyên nghiệp.

Bề mặt trơn phù hợp thêu logo, in ấn và heat transfer theo brand guideline. Sản phẩm phù hợp đồng phục văn phòng, hội thảo, sự kiện doanh nghiệp và quà tặng thương hiệu.

Có thể tùy chỉnh theo nhu cầu về màu, size và phương án gia công. ATTD cung cấp nguồn polo doanh nghiệp trơn theo mô hình B2B sourcing.

Liên hệ báo giá và tư vấn phương án phù hợp quy mô doanh nghiệp.`,
    faqs: [
      { question: "Polo doanh nghiệp khác polo đồng phục?", answer: "Cả hai hướng tới corporate. Liên hệ ATTD tư vấn dòng phù hợp từng ngân sách và mục đích." },
      { question: "Có phù hợp quà tặng doanh nghiệp?", answer: "Có. Phù hợp quà tặng thương hiệu khi kết hợp thêu/in logo theo yêu cầu." },
      { question: "Agency có đặt polo doanh nghiệp được không?", answer: "Có. ATTD phục vụ agency, đại lý và doanh nghiệp trực tiếp." },
      { question: "Thêu logo trên polo doanh nghiệp?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo file thiết kế. Liên hệ tư vấn gia công." },
      { question: "Báo giá polo doanh nghiệp?", answer: "Liên hệ ATTD với số lượng, màu và yêu cầu gia công." },
    ],
  }),
  polo("Áo Polo Cool", "ao-polo-cool", "AP-CAT-08", {
    seoTitle: "Áo Polo Cool Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo cool trơn sỉ — dòng blank polo thoáng mát cho môi trường nóng và active. Nguồn hàng B2B từ ATTD.",
    shortDescription:
      "Áo polo cool trơn — dòng blank polo thoáng mát, phù hợp môi trường nóng, outdoor và đồng phục active.",
    content: `Áo polo cool là dòng blank polo hướng tới thoải mái khi mặc — phù hợp doanh nghiệp, đại lý đồng phục và thương hiệu cần polo trơn cho môi trường nóng, outdoor, logistics và hoạt động ngoài trời.

Bề mặt trơn phù hợp thêu logo và in ấn theo yêu cầu. Sản phẩm phù hợp sự kiện outdoor, F&B môi trường nóng và đồng phục active.

Có thể tùy chỉnh theo nhu cầu về màu, size và gia công. ATTD cung cấp polo cool trơn theo mô hình B2B — liên hệ báo giá và tư vấn nguồn hàng.`,
    faqs: [
      { question: "Polo cool phù hợp môi trường nào?", answer: "Outdoor, sự kiện ngoài trời, logistics và môi trường làm việc cần thoáng mát hơn." },
      { question: "Cool khác polo basic?", answer: "Cool hướng tới thoải mái mặc trong điều kiện nóng. Basic là dòng nền tảng đa dụng. Liên hệ tư vấn." },
      { question: "Có thêu logo trên polo cool?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo yêu cầu." },
      { question: "Doanh nghiệp nào chọn polo cool?", answer: "Doanh nghiệp và đại lý phục vụ khách hàng cần đồng phục polo thoáng mát." },
      { question: "Đặt polo cool qua đại lý?", answer: "Có. Đăng ký đại lý hoặc liên hệ trực tiếp ATTD." },
    ],
  }),
  polo("Áo Polo Cao Cấp", "ao-polo-cao-cap", "AP-CAT-09", {
    seoTitle: "Áo Polo Cao Cấp Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo cao cấp trơn sỉ — dòng blank polo premium cho thương hiệu và đồng phục cao cấp. Nguồn B2B từ ATTD.",
    shortDescription:
      "Áo polo cao cấp trơn — dòng blank polo top-tier, phù hợp thương hiệu premium, resort và đồng phục cao cấp.",
    content: `Áo polo cao cấp là dòng blank polo top-tier trong danh mục polo trơn — hướng tới đại lý đồng phục premium, resort, golf club và doanh nghiệp cần chất lượng vải và hoàn thiện cao nhất trong phân khúc polo blank.

Bề mặt trơn, mịn — thuận lợi thêu logo phức tạp và in ấn sắc nét. Phù hợp đồng phục cấp lãnh đạo, khách sạn cao cấp và thương hiệu chú trọng hình ảnh.

Có thể tùy chỉnh theo nhu cầu về màu, size và gia công. ATTD cung cấp polo cao cấp trơn theo mô hình wholesale apparel — liên hệ báo giá B2B.`,
    faqs: [
      { question: "Polo cao cấp khác polo premium?", answer: "Cao cấp là dòng top-tier trong danh mục polo blank. Premium là nâng cấp từ basic. Liên hệ tư vấn dòng phù hợp." },
      { question: "Phù hợp golf club/resort?", answer: "Có. Thường được chọn cho đồng phục premium và thương hiệu hospitality cao cấp." },
      { question: "Thêu logo trên polo cao cấp?", answer: "Có. Bề mặt trơn phù hợp thêu logo theo yêu cầu. Liên hệ tư vấn gia công." },
      { question: "Có so sánh mẫu các dòng polo?", answer: "Có thể hỗ trợ gửi mẫu tùy đối tác. Liên hệ ATTD trao đổi." },
      { question: "Báo giá polo cao cấp?", answer: "Liên hệ ATTD với số lượng và yêu cầu gia công cụ thể." },
    ],
  }),
  polo("Áo Polo Blank Export", "ao-polo-blank-export", "AP-CAT-10", {
    seoTitle: "Áo Polo Blank Export Trơn Sỉ | ATTD",
    seoDescription:
      "Áo polo blank export trơn sỉ — nguồn blank polo cho xuất khẩu và OEM. Phù hợp đại lý, thêu logo, đồng phục.",
    shortDescription:
      "Áo polo blank export trơn — dòng blank polo cho xuất khẩu, OEM và đại lý cần nguồn hàng ổn định, có thể tùy chỉnh.",
    content: `Áo polo blank export là dòng blank polo hướng tới đại lý xuất khẩu, công ty trading, xưởng gia công và doanh nghiệp cần nguồn polo trơn ổn định cho đơn lặp lại hoặc phân phối quốc tế.

Phù hợp thêu logo, in ấn và gia công theo yêu cầu. Có thể tùy chỉnh theo nhu cầu về màu sắc, size, tem mác và phương án đóng gói — liên hệ ATTD trao đổi chi tiết.

Ứng dụng: OEM/ODM, phân phối đại lý, xuất khẩu và hàng trơn cho xưởng thêu in. ATTD hỗ trợ tư vấn nguồn hàng polo blank export theo mô hình B2B sourcing.

Liên hệ báo giá và phương án hợp tác phù hợp quy mô xuất khẩu hoặc phân phối nội địa.`,
    faqs: [
      { question: "Polo blank export khác polo thường?", answer: "Hướng tới đơn lặp lại, xuất khẩu và OEM — hỗ trợ tùy chỉnh tem mác, đóng gói theo yêu cầu." },
      { question: "Có hỗ trợ xuất khẩu không?", answer: "Có thể trao đổi theo từng đơn. Liên hệ ATTD với yêu cầu xuất khẩu cụ thể." },
      { question: "Ai đặt polo blank export?", answer: "Đại lý xuất khẩu, trading, xưởng gia công FOB và doanh nghiệp cần nguồn blank ổn định." },
      { question: "Polo export có thêu/in được không?", answer: "Có. Phù hợp thêu logo và in ấn theo yêu cầu." },
      { question: "Trao đổi đơn polo export?", answer: "Liên hệ ATTD trực tiếp với thông tin số lượng, màu, timeline và yêu cầu cụ thể." },
    ],
  }),
];

export const CATALOG_BY_SLUG: ReadonlyMap<string, ProductCatalogItem> = new Map(
  PRODUCT_CATALOG.map((item) => [item.slug, item])
);

export const CATALOG_SLUGS: ReadonlySet<string> = new Set(
  PRODUCT_CATALOG.map((item) => item.slug)
);

export function getCatalogProduct(slug: string): ProductCatalogItem | undefined {
  return CATALOG_BY_SLUG.get(slug);
}

export function isCatalogProduct(slug: string): boolean {
  return CATALOG_SLUGS.has(slug);
}

export function getAllCatalogProducts(): ProductCatalogItem[] {
  return PRODUCT_CATALOG;
}

export function getAllCatalogSlugs(): string[] {
  return PRODUCT_CATALOG.map((item) => item.slug);
}
