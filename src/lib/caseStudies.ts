/** Case study content — UI config only. No invented brand names. */

export type CaseStudy = {
  id: string;
  title: string;
  industry: string;
  productType: string;
  summary: string;
  /** Optional image filename in /public/uploads/case-studies/ */
  image?: string;
};

export const CASE_STUDIES_SECTION = {
  title: "Dự án tiêu biểu",
  description:
    "Một số hạng mục ATTD đã hỗ trợ nguồn hàng và gia công cho đại lý, xưởng in và doanh nghiệp.",
} as const;

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs1",
    title: "Đồng phục nhân viên cho chuỗi bán lẻ",
    industry: "Bán lẻ",
    productType: "Áo thun trơn + in logo",
    summary:
      "Cung cấp blank cotton đa màu, hỗ trợ in logo theo bộ nhận diện và giao hàng theo lịch triển khai cửa hàng.",
  },
  {
    id: "cs2",
    title: "Polo đồng phục doanh nghiệp dịch vụ",
    industry: "Dịch vụ doanh nghiệp",
    productType: "Áo polo trơn + thêu logo",
    summary:
      "Nguồn polo pique sẵn kho, phối hợp thêu logo ngực trái và giao theo size chart chuẩn cho toàn bộ nhân sự.",
  },
  {
    id: "cs3",
    title: "Quà tặng sự kiện tri ân khách hàng",
    industry: "Marketing & sự kiện",
    productType: "Tote + nón + áo thun",
    summary:
      "Combo quà tặng blank trơn cho đại lý agency, hỗ trợ in thêu theo concept và đóng gói theo số lượng sự kiện.",
  },
];
