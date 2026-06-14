import { CTA_BLOCK_SNIPPET, FAQ_BLOCK_SNIPPET } from "@/features/blog/seo-blocks";

export type SeoTemplate = {
  id: string;
  label: string;
  description: string;
  content: string;
};

export const SEO_ARTICLE_STARTER = `# Tiêu đề bài viết

## Giới thiệu

Viết phần mở đầu...

## Lợi ích

Liệt kê lợi ích...

## Tiêu chí lựa chọn

Nội dung...

## Báo giá

Nội dung...

## Kết luận

Nội dung...

${FAQ_BLOCK_SNIPPET}
`;

export const SEO_TEMPLATES: SeoTemplate[] = [
  {
    id: "nguon-hang",
    label: "Nguồn hàng",
    description: "Bài SEO về nguồn hàng B2B, tiêu chí chọn nhà cung cấp.",
    content: `# Nguồn hàng áo thun trơn giá sỉ cho đại lý

## Giới thiệu

Giới thiệu nhu cầu tìm nguồn hàng ổn định cho đại lý và xưởng in.

## Vì sao nên chọn nguồn hàng có kho thực tế

Mô tả lợi ích khi làm việc với nhà cung cấp có hàng sẵn, nhiều màu và size.

## Tiêu chí đánh giá chất liệu và form áo

Nội dung về cotton, CVC, form regular và tiêu chuẩn QC.

## Quy trình báo giá và giao hàng

Giải thích cách nhận báo giá, MOQ và thời gian giao.

## Kết luận

Tóm tắt và khuyến nghị liên hệ ATTD.

${FAQ_BLOCK_SNIPPET}

${CTA_BLOCK_SNIPPET}
`,
  },
  {
    id: "oem",
    label: "OEM",
    description: "Bài SEO về OEM, private label và sản xuất theo yêu cầu.",
    content: `# OEM áo thun và polo theo yêu cầu doanh nghiệp

## OEM là gì?

Giải thích mô hình OEM/private label.

## Lợi ích OEM cho thương hiệu

Branding, kiểm soát chất lượng, tối ưu chi phí.

## Quy trình OEM tại ATTD

Tư vấn → mẫu → sản xuất → giao hàng.

## Báo giá OEM

Yếu tố ảnh hưởng giá và thời gian.

## Kết luận

${FAQ_BLOCK_SNIPPET}

:::cta
title: Nhận báo giá OEM
button: Liên hệ ATTD
url: /oem
:::
`,
  },
  {
    id: "dai-ly",
    label: "Đại lý",
    description: "Bài SEO hướng tới đại lý và chính sách hợp tác.",
    content: `# Chính sách đại lý áo thun trơn ATTD

## Cơ hội kinh doanh cho đại lý

Thị trường áo thun trơn sỉ và nhu cầu B2B.

## Quyền lợi đại lý

Giá sỉ, hỗ trợ marketing, ổn định nguồn hàng.

## Điều kiện hợp tác

Yêu cầu cơ bản và quy trình đăng ký.

## Hỗ trợ bán hàng

Tư vấn sản phẩm, báo giá nhanh, giao hàng toàn quốc.

## Kết luận

${FAQ_BLOCK_SNIPPET}

:::cta
title: Đăng ký làm đại lý
button: Xem chính sách đại lý
url: /dai-ly
:::
`,
  },
  {
    id: "qua-tang",
    label: "Quà tặng doanh nghiệp",
    description: "Bài SEO về quà tặng và đồng phục doanh nghiệp.",
    content: `# Quà tặng doanh nghiệp từ áo thun và polo in logo

## Nhu cầu quà tặng B2B

Tại sao doanh nghiệp chọn áo thun, polo làm quà tặng.

## Gợi ý sản phẩm phù hợp

Áo thun trơn, polo, bộ quà tặng theo ngân sách.

## Quy trình in logo và đóng gói

Tư vấn thiết kế, in lụa/chuyển nhiệt, đóng gói theo set.

## Báo giá quà tặng doanh nghiệp

MOQ, thời gian sản xuất, chi phí in.

## Kết luận

${FAQ_BLOCK_SNIPPET}

:::cta
title: Nhận tư vấn quà tặng doanh nghiệp
button: Liên hệ ATTD
url: /qua-tang-doanh-nghiep
:::
`,
  },
  {
    id: "dong-phuc",
    label: "Đồng phục công ty",
    description: "Bài SEO về đồng phục, team building, nhân viên.",
    content: `# Đồng phục công ty: chọn áo thun và polo phù hợp

## Vì sao doanh nghiệp cần đồng phục thống nhất

Nhận diện thương hiệu, gắn kết đội ngũ.

## Tiêu chí chọn vải và form áo

Cotton, CVC, thoáng mát, bền màu.

## Size guide và màu sắc

Hướng dẫn chọn size và bảng màu phổ biến.

## Quy trình sản xuất đồng phục

Tư vấn → duyệt mẫu → sản xuất → giao hàng.

## Kết luận

${FAQ_BLOCK_SNIPPET}

${CTA_BLOCK_SNIPPET}
`,
  },
];
