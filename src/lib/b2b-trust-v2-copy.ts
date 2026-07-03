import type { EvidenceItem, ProcessTrustStep } from "@/lib/b2b-trust-v2.types";

export const TRUST_REASSURANCE_PRIVACY =
  "Thông tin chỉ dùng để tư vấn, không chia sẻ cho bên thứ ba.";

export const TRUST_REASSURANCE_DEALER_PRIVACY =
  "Thông tin chỉ dùng để tư vấn hợp tác, không chia sẻ cho bên thứ ba.";

export const CONTACT_PROCESS_STEPS: readonly ProcessTrustStep[] = [
  { label: "ATTD tiếp nhận thông tin" },
  { label: "Liên hệ trong giờ làm việc" },
  { label: "Tư vấn sản phẩm / chất liệu phù hợp" },
  { label: "Gửi báo giá theo số lượng" },
];

export const DEALER_PARTNERSHIP_STEPS: readonly ProcessTrustStep[] = [
  { label: "Tiếp nhận đăng ký" },
  { label: "Đánh giá nhu cầu hợp tác" },
  { label: "Tư vấn danh mục / mô hình nguồn hàng phù hợp" },
  { label: "Liên hệ trong giờ làm việc" },
];

export const PDP_CONVERSION_POINTS: readonly ProcessTrustStep[] = [
  { label: "Tư vấn mẫu phù hợp" },
  { label: "Báo giá theo số lượng và yêu cầu in/thêu" },
  { label: "Phản hồi trong giờ làm việc" },
];

export const PDP_QUOTE_PROCESS_STEPS: readonly ProcessTrustStep[] = [
  { label: "Tiếp nhận yêu cầu" },
  { label: "Liên hệ xác nhận" },
  { label: "Tư vấn quy cách nếu cần" },
  { label: "Gửi báo giá" },
];

export const BLOG_CTA_POINTS: readonly ProcessTrustStep[] = [
  { label: "Trao đổi nhu cầu thực tế" },
  { label: "Gợi ý sản phẩm phù hợp" },
  { label: "Báo giá theo số lượng / OEM nếu cần" },
];

export const PDP_ORDER_SUPPORT_STEPS: readonly ProcessTrustStep[] = [
  { label: "Xác nhận sản phẩm và số lượng" },
  { label: "Tư vấn in/thêu hoặc OEM nếu cần" },
  { label: "Báo giá và tiến độ rõ ràng" },
  { label: "Theo dõi đến khi giao hàng" },
];

export const CONTACT_EVIDENCE_ITEMS: readonly EvidenceItem[] = [
  {
    title: "Tiếp nhận yêu cầu",
    description: "ATTD ghi nhận nhu cầu và phân loại theo sản phẩm, số lượng.",
    category: "Đơn hàng thực tế",
  },
  {
    title: "Tư vấn & báo giá",
    description: "Trao đổi quy cách, chất liệu và phương án phù hợp.",
    category: "Mẫu vật liệu",
  },
];

export const DEALER_EVIDENCE_ITEMS: readonly EvidenceItem[] = [
  {
    title: "Danh mục nguồn hàng",
    description: "Đồng phục, phôi trơn, quà tặng doanh nghiệp.",
    category: "Kho hàng",
  },
  {
    title: "In / thêu / OEM",
    description: "Hỗ trợ triển khai theo yêu cầu thương hiệu.",
    category: "In / thêu",
  },
  {
    title: "Kiểm tra chất lượng",
    description: "Quy trình kiểm tra trước khi giao.",
    category: "QC",
  },
];

export const PDP_EVIDENCE_ITEMS: readonly EvidenceItem[] = [
  {
    title: "Xử lý đơn hàng",
    description: "Xác nhận MOQ, tiến độ và yêu cầu hoàn thiện.",
    category: "Sản xuất",
  },
  {
    title: "In / thêu logo",
    description: "Tư vấn kỹ thuật phù hợp chất liệu.",
    category: "In / thêu",
  },
];
