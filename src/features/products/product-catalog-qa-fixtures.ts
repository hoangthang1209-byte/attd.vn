/**
 * Sprint 27.2.6 — Non-destructive QA fixture plan.
 * Create temporary DRAFT products in dev/staging; never auto-seed production.
 */

export type QaFixtureScenario = {
  id: string;
  title: string;
  purpose: string;
  setup: string[];
  automatedChecks: string[];
  manualBrowserChecks: string[];
};

export const PRODUCT_CATALOG_QA_FIXTURES: QaFixtureScenario[] = [
  {
    id: "simple-no-variants",
    title: "Sản phẩm đơn giản không biến thể",
    purpose: "PDP không chọn biến thể, báo giá theo sản phẩm.",
    setup: [
      "Tạo sản phẩm DRAFT: 1 ảnh đại diện HTTPS, MOQ/lead time cấp sản phẩm, không nhóm thuộc tính.",
    ],
    automatedChecks: [
      "product-catalog-qa-regression: resolveEffectiveMoq/leadTime",
      "export compatibility self-test",
    ],
    manualBrowserChecks: [
      "/admin/products → tạo/sửa → Lưu",
      "/san-pham/[slug] → gallery, MOQ, Yêu cầu báo giá",
    ],
  },
  {
    id: "structured-apparel",
    title: "Áo structured: Màu × Size",
    purpose: "Ma trận, MOQ/lead time override, ảnh biến thể, inactive.",
    setup: [
      "Nhóm: Màu sắc (Đen, Trắng, Navy); Kích thước (S, M, L).",
      "≥1 biến thể INACTIVE, ≥1 có imageUrl HTTPS, ≥1 moqOverride, ≥1 leadTimeOverride.",
    ],
    automatedChecks: [
      "structured optionValues parse",
      "variant status label mapping",
    ],
    manualBrowserChecks: [
      "Ma trận admin: lọc trạng thái, bulk MOQ/stock",
      "PDP: chỉ ACTIVE, đổi ảnh theo biến thể",
    ],
  },
  {
    id: "legacy-color-size",
    title: "Biến thể legacy colorName/sizeName",
    purpose: "Fallback legacy không trộn optionValues.",
    setup: ["Sản phẩm không có nhóm thuộc tính; biến thể cũ với colorName/colorCode/sizeName."],
    automatedChecks: ["export legacy row (no optionValues mixing)"],
    manualBrowserChecks: ["PDP legacy selector", "import/export round-trip"],
  },
  {
    id: "full-content",
    title: "Mô tả + thông số + tùy chỉnh",
    purpose: "Anchor tabs và sections ẩn khi trống.",
    setup: ["description dài, ≥3 thông số, ≥2 khả năng tùy chỉnh enabled."],
    automatedChecks: [],
    manualBrowserChecks: ["PDP tabs, spec/custom sections", "mobile 390px wrap"],
  },
  {
    id: "no-images",
    title: "Không có ảnh",
    purpose: "Gallery fallback sạch.",
    setup: ["featuredImage và gallery trống, biến thể không imageUrl."],
    automatedChecks: ["isValidProductImageUrl rejects non-http"],
    manualBrowserChecks: ["PDP placeholder, không crash"],
  },
  {
    id: "invalid-image-url",
    title: "URL ảnh không hợp lệ (dữ liệu cũ)",
    purpose: "Admin chặn mới; PDP fallback graceful.",
    setup: ["Trong DB (staging): featuredImage hoặc variant imageUrl không phải https://."],
    automatedChecks: ["validateProductImageUrlField"],
    manualBrowserChecks: ["Form validation khi sửa", "PDP không vỡ layout"],
  },
  {
    id: "all-variants-inactive",
    title: "Tất cả biến thể ngừng/lưu trữ",
    purpose: "PDP vẫn hiển thị nội dung + báo giá.",
    setup: ["Structured product; đặt mọi variantStatus ≠ ACTIVE."],
    automatedChecks: ["filterPublicVariants returns empty"],
    manualBrowserChecks: ["PDP thông báo không có phân loại đang bán", "Báo giá vẫn mở"],
  },
  {
    id: "long-vietnamese-text",
    title: "Tên/option/spec dài tiếng Việt",
    purpose: "Layout matrix + PDP không vỡ.",
    setup: ["Tên SP >80 ký tự; nhãn option dài; giá trị spec dài."],
    automatedChecks: [],
    manualBrowserChecks: ["Matrix ellipsis/scroll", "PDP title wrap"],
  },
  {
    id: "quote-history",
    title: "Lịch sử quan tâm báo giá",
    purpose: "CRM interest không ảnh hưởng catalog save.",
    setup: ["Sản phẩm đã có quote request từ PDP (staging CRM)."],
    automatedChecks: [],
    manualBrowserChecks: ["Sửa SP không xóa interest", "variant lifecycle vẫn an toàn"],
  },
  {
    id: "mixed-variant-statuses",
    title: "ACTIVE + INACTIVE + ARCHIVED",
    purpose: "Bulk, export, PDP filtering.",
    setup: ["Cùng sản phẩm: mix 3 trạng thái; export include inactive bật."],
    automatedChecks: ["variantStatusLabel for all enums", "export inactive filter"],
    manualBrowserChecks: ["Bulk Quản lý trạng thái", "Export → import preview"],
  },
];

export const ROUND_TRIP_QA_CHECKLIST = [
  "Xuất sản phẩm (XLSX) từ admin",
  "Chỉnh sửa offline các trường không định danh (MOQ, mô tả, tồn kho)",
  "Không đổi productCode/systemCode/SKU trừ khi chủ đích",
  "Tải file vào Import → chế độ phù hợp → Xem trước",
  "Xác nhận hàng khớp: tạo mới / cập nhật / bỏ qua đúng ý định",
  "Chỉ Thực hiện nhập sau khi không còn dòng lỗi",
] as const;
