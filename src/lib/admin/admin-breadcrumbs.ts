export type AdminBreadcrumbMeta = {
  breadcrumbs: string[];
  title: string;
  description: string;
};

type AdminBreadcrumbRule = {
  path: string;
  meta: AdminBreadcrumbMeta;
};

/**
 * CMS IA v2.0 — shell breadcrumb / title metadata authority.
 * Matching: longest / most-specific static or `:param` path wins.
 * Non-param paths also match descendants via prefix.
 */
const breadcrumbRules: AdminBreadcrumbRule[] = [
  // ── Dashboard ──────────────────────────────────────────────
  {
    path: "/admin/dashboard",
    meta: {
      breadcrumbs: ["Dashboard"],
      title: "Dashboard",
      description: "Theo dõi nhanh tình hình vận hành, thương mại và hệ thống CMS.",
    },
  },
  {
    path: "/admin",
    meta: {
      breadcrumbs: ["Dashboard"],
      title: "Dashboard",
      description: "Theo dõi nhanh tình hình vận hành, thương mại và hệ thống CMS.",
    },
  },

  // ── THƯƠNG MẠI ─────────────────────────────────────────────
  {
    path: "/admin/crm/leads",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Lead"],
      title: "Quản lý lead",
      description: "Tiếp nhận, phân loại và theo dõi cơ hội bán hàng mới.",
    },
  },
  {
    path: "/admin/crm/customers/import",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Khách hàng", "Import Excel"],
      title: "Import khách hàng",
      description: "Nhập danh sách khách hàng từ file Excel và kiểm tra trước khi import.",
    },
  },
  {
    path: "/admin/crm/customers/new",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Khách hàng", "Tạo mới"],
      title: "Tạo khách hàng",
      description: "Thêm hồ sơ khách hàng mới vào CRM.",
    },
  },
  {
    path: "/admin/crm/customers/:id",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Khách hàng", "Chi tiết"],
      title: "Chi tiết khách hàng",
      description: "Xem và cập nhật hồ sơ khách hàng, liên hệ và lịch sử chăm sóc.",
    },
  },
  {
    path: "/admin/crm/customers",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Khách hàng"],
      title: "Khách hàng",
      description: "Quản lý hồ sơ công ty, người liên hệ và lịch sử chăm sóc.",
    },
  },
  {
    path: "/admin/crm/whatsapp-assistant",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "AI Assistant"],
      title: "AI Assistant",
      description: "Hỗ trợ phân tích hội thoại và tạo dữ liệu bán hàng từ trao đổi khách hàng.",
    },
  },
  {
    path: "/admin/crm",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "CRM"],
      title: "CRM Pipeline",
      description: "Theo dõi pipeline bán hàng và trạng thái xử lý khách hàng.",
    },
  },
  {
    path: "/admin/sales/follow-up",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Follow-up"],
      title: "Follow-up",
      description: "Theo dõi các việc cần chăm sóc tiếp theo trong quy trình bán hàng.",
    },
  },
  {
    path: "/admin/sales/pipeline",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Pipeline bán hàng"],
      title: "Pipeline bán hàng",
      description: "Quản lý các cơ hội thương mại theo giai đoạn bán hàng.",
    },
  },
  {
    path: "/admin/quotes/new",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Báo giá", "Tạo mới"],
      title: "Tạo báo giá",
      description: "Tạo báo giá mới cho khách hàng.",
    },
  },
  {
    path: "/admin/quotes/:id/edit",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Báo giá", "Chỉnh sửa"],
      title: "Chỉnh sửa báo giá",
      description: "Cập nhật nội dung và điều khoản báo giá.",
    },
  },
  {
    path: "/admin/quotes/:id",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Báo giá", "Chi tiết"],
      title: "Chi tiết báo giá",
      description: "Xem chi tiết báo giá và trạng thái xử lý.",
    },
  },
  {
    path: "/admin/quotes",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Báo giá"],
      title: "Quản lý báo giá",
      description: "Tạo, gửi và theo dõi báo giá khách hàng.",
    },
  },
  {
    path: "/admin/orders/new",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Đơn hàng", "Tạo mới"],
      title: "Tạo đơn hàng",
      description: "Tạo đơn hàng mới từ báo giá hoặc nhập trực tiếp.",
    },
  },
  {
    path: "/admin/orders/:id/edit",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Đơn hàng", "Chỉnh sửa"],
      title: "Chỉnh sửa đơn hàng",
      description: "Cập nhật thông tin và trạng thái đơn hàng.",
    },
  },
  {
    path: "/admin/orders/:id",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Đơn hàng", "Chi tiết"],
      title: "Chi tiết đơn hàng",
      description: "Xem chi tiết đơn hàng và các bước xử lý liên quan.",
    },
  },
  {
    path: "/admin/orders",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Đơn hàng"],
      title: "Đơn hàng",
      description: "Theo dõi đơn hàng đã chốt và trạng thái xử lý liên quan.",
    },
  },
  {
    path: "/admin/pricing/product-tiers",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Giá sản phẩm"],
      title: "Giá sản phẩm",
      description: "Quản lý tầng giá theo sản phẩm, biến thể và số lượng.",
    },
  },
  {
    path: "/admin/pricing",
    meta: {
      breadcrumbs: ["THƯƠNG MẠI", "Bảng giá"],
      title: "Pricing Engine",
      description: "Tính giá, kiểm tra biên lợi nhuận và chuẩn hóa báo giá.",
    },
  },

  // ── SẢN PHẨM ───────────────────────────────────────────────
  {
    path: "/admin/products/import",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Import / Export"],
      title: "Import / Export",
      description: "Nhập, xuất và cập nhật dữ liệu catalog theo lô.",
    },
  },
  {
    path: "/admin/products/new",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Sản phẩm", "Tạo mới"],
      title: "Tạo sản phẩm mới",
      description: "Tạo sản phẩm mới trong catalog B2B.",
    },
  },
  {
    path: "/admin/products/:id/edit",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Sản phẩm", "Chỉnh sửa"],
      title: "Chỉnh sửa sản phẩm",
      description: "Cập nhật thông tin, biến thể và nội dung sản phẩm.",
    },
  },
  {
    path: "/admin/products",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Sản phẩm"],
      title: "Sản phẩm",
      description: "Quản lý catalog sản phẩm, nội dung bán hàng và trạng thái hiển thị.",
    },
  },
  {
    path: "/admin/danh-muc",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Danh mục"],
      title: "Danh mục",
      description: "Quản lý cấu trúc danh mục sản phẩm trên website và CMS.",
    },
  },
  {
    path: "/admin/variant",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "SKU & Biến thể"],
      title: "SKU & Biến thể",
      description: "Quản lý SKU, màu sắc, size và các tổ hợp biến thể sản phẩm.",
    },
  },
  {
    path: "/admin/attributes",
    meta: {
      breadcrumbs: ["SẢN PHẨM", "Thuộc tính"],
      title: "Thuộc tính sản phẩm",
      description: "Chuẩn hóa các thuộc tính dùng cho catalog và biến thể.",
    },
  },

  // ── KỸ THUẬT SẢN PHẨM ─────────────────────────────────────
  {
    path: "/admin/tech-pack",
    meta: {
      breadcrumbs: ["KỸ THUẬT SẢN PHẨM", "Tech Pack"],
      title: "Tech Pack",
      description: "Quản lý tài liệu kỹ thuật phục vụ phát triển mẫu và sản xuất.",
    },
  },
  {
    path: "/admin/pattern",
    meta: {
      breadcrumbs: ["KỸ THUẬT SẢN PHẨM", "Pattern"],
      title: "Pattern",
      description: "Quản lý rập, thông số và dữ liệu kỹ thuật theo sản phẩm.",
    },
  },
  {
    path: "/admin/measurement-template",
    meta: {
      breadcrumbs: ["KỸ THUẬT SẢN PHẨM", "Mẫu thông số"],
      title: "Mẫu thông số",
      description: "Chuẩn hóa bộ thông số đo dùng cho tech pack và pattern.",
    },
  },
  {
    path: "/admin/production-materials",
    meta: {
      breadcrumbs: ["KỸ THUẬT SẢN PHẨM", "Nguyên vật liệu"],
      title: "Nguyên vật liệu",
      description: "Quản lý thư viện nguyên vật liệu phục vụ BOM và sản xuất.",
    },
  },
  {
    path: "/admin/trims",
    meta: {
      breadcrumbs: ["KỸ THUẬT SẢN PHẨM", "Phụ liệu"],
      title: "Phụ liệu",
      description: "Quản lý phụ liệu, nhãn, bo, dây kéo và chi tiết hoàn thiện sản phẩm.",
    },
  },

  // ── SẢN XUẤT ───────────────────────────────────────────────
  {
    path: "/admin/manufacturing-library/new",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất", "Tạo mới"],
      title: "Tạo tài sản sản xuất",
      description: "Tạo dữ liệu / tài sản mới trong thư viện sản xuất.",
    },
  },
  {
    path: "/admin/manufacturing-library/categories",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất", "Danh mục"],
      title: "Danh mục thư viện sản xuất",
      description: "Quản lý danh mục dùng trong thư viện sản xuất.",
    },
  },
  {
    path: "/admin/manufacturing-library/display-locations",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất", "Vị trí hiển thị"],
      title: "Vị trí hiển thị thư viện sản xuất",
      description: "Cấu hình vị trí hiển thị tài sản thư viện sản xuất.",
    },
  },
  {
    path: "/admin/manufacturing-library/workflows",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất", "Quy trình"],
      title: "Quy trình sản xuất",
      description: "Quản lý quy trình gắn với thư viện sản xuất.",
    },
  },
  {
    path: "/admin/manufacturing-library/:id",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất", "Chi tiết"],
      title: "Sửa tài sản sản xuất",
      description: "Xem và chỉnh sửa tài sản trong thư viện sản xuất.",
    },
  },
  {
    path: "/admin/manufacturing-library",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Thư viện sản xuất"],
      title: "Thư viện sản xuất",
      description: "Quản lý tài sản và dữ liệu phục vụ sản xuất.",
    },
  },
  {
    path: "/admin/production-suppliers",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Nhà cung cấp sản xuất"],
      title: "Nhà cung cấp sản xuất",
      description: "Quản lý nhà cung cấp phục vụ sản xuất, gia công và nguyên liệu.",
    },
  },
  {
    path: "/admin/manufacturing/production-timeline",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Tiến độ sản xuất"],
      title: "Tiến độ sản xuất",
      description: "Theo dõi tiến độ sản xuất theo từng item đơn hàng, công đoạn và rủi ro giao hàng.",
    },
  },
  {
    path: "/admin/production",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Lệnh sản xuất"],
      title: "Lệnh sản xuất",
      description: "Theo dõi lệnh sản xuất và các trạng thái vận hành liên quan.",
    },
  },
  {
    path: "/admin/print-methods",
    meta: {
      breadcrumbs: ["SẢN XUẤT", "Công nghệ in & thêu"],
      title: "Công nghệ in & thêu",
      description: "Quản lý thư viện phương pháp in, thêu và hoàn thiện sản phẩm.",
    },
  },

  // ── ĐẠI LÝ & B2B ───────────────────────────────────────────
  {
    path: "/admin/pricing/price-groups",
    meta: {
      breadcrumbs: ["ĐẠI LÝ & B2B", "Nhóm giá đại lý"],
      title: "Nhóm giá đại lý",
      description: "Quản lý nhóm giá và chính sách giá dành cho đại lý.",
    },
  },
  {
    path: "/admin/dealer/rfqs",
    meta: {
      breadcrumbs: ["ĐẠI LÝ & B2B", "Yêu cầu báo giá"],
      title: "Yêu cầu báo giá",
      description: "Theo dõi yêu cầu báo giá từ đại lý và khách B2B.",
    },
  },
  {
    path: "/admin/dealer",
    meta: {
      breadcrumbs: ["ĐẠI LÝ & B2B", "Công ty đại lý"],
      title: "Công ty đại lý",
      description: "Quản lý hồ sơ đại lý, trạng thái hợp tác và dữ liệu B2B.",
    },
  },

  // ── NỘI DUNG ───────────────────────────────────────────────
  {
    path: "/admin/blog",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Blog"],
      title: "Blog",
      description: "Quản lý bài viết, nội dung SEO và truyền thông thương hiệu.",
    },
  },
  {
    path: "/admin/landing-pages",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Landing Page"],
      title: "Landing Page",
      description: "Quản lý các trang landing phục vụ SEO, chiến dịch và chuyển đổi.",
    },
  },
  {
    path: "/admin/case-studies",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Case Study"],
      title: "Case Study",
      description: "Quản lý dự án tiêu biểu và bằng chứng năng lực trên website.",
    },
  },
  {
    path: "/admin/content/reviews/:id",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Kiểm duyệt nội dung", "Chi tiết"],
      title: "Chi tiết kiểm duyệt",
      description: "Xem và xử lý một mục nội dung đang chờ kiểm duyệt.",
    },
  },
  {
    path: "/admin/content/reviews",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Kiểm duyệt nội dung"],
      title: "Kiểm duyệt nội dung",
      description: "Duyệt và phê duyệt nội dung trước khi xuất bản.",
    },
  },
  {
    path: "/admin/content/publishing",
    meta: {
      breadcrumbs: ["NỘI DUNG", "Xuất bản nội dung"],
      title: "Xuất bản nội dung",
      description: "Quản lý lịch và trạng thái xuất bản nội dung.",
    },
  },

  // ── SEO & GROWTH ───────────────────────────────────────────
  {
    path: "/admin/seo-planning",
    meta: {
      breadcrumbs: ["SEO & GROWTH", "SEO Planning"],
      title: "SEO Planning",
      description: "Quản lý kế hoạch SEO, campaign và nội dung tăng trưởng organic.",
    },
  },
  {
    path: "/admin/content/seo-topics",
    meta: {
      breadcrumbs: ["SEO & GROWTH", "Kế hoạch nội dung"],
      title: "Kế hoạch nội dung SEO",
      description: "Lập kế hoạch, lọc và quản lý chủ đề SEO theo chiến lược và cụm chủ đề.",
    },
  },
  {
    path: "/admin/content/launch",
    meta: {
      breadcrumbs: ["SEO & GROWTH", "Khởi động Content SEO"],
      title: "Khởi động Content SEO",
      description:
        "Dashboard kích hoạt bài SEO đầu tiên trên quy trình Content đã hoàn thiện — không auto-publish.",
    },
  },
  {
    path: "/admin/content/seo-strategies",
    meta: {
      breadcrumbs: ["SEO & GROWTH", "Chiến lược SEO"],
      title: "Chiến lược SEO",
      description: "Quản lý chiến lược SEO, cụm chủ đề và tiến độ nội dung theo chiến dịch.",
    },
  },
  {
    path: "/admin/content/seo",
    meta: {
      breadcrumbs: ["SEO & GROWTH", "Tổng quan SEO"],
      title: "SEO Content Platform",
      description: "Tổng quan kế hoạch nội dung SEO, chủ đề ưu tiên và độ phủ cụm chủ đề.",
    },
  },

  // ── MEDIA ──────────────────────────────────────────────────
  {
    path: "/admin/media",
    meta: {
      breadcrumbs: ["MEDIA", "Thư viện tài sản"],
      title: "Thư viện tài sản",
      description: "Quản lý tài sản media dùng chung cho sản phẩm, nội dung và website.",
    },
  },
  {
    path: "/admin/content/media-libraries",
    meta: {
      breadcrumbs: ["MEDIA", "Nhóm thư viện"],
      title: "Nhóm thư viện",
      description: "Quản lý Library (nhóm nội dung) cho Media DAM và SEO asset discovery.",
    },
  },
  {
    path: "/admin/content/media-roles",
    meta: {
      breadcrumbs: ["MEDIA", "Vai trò hiển thị"],
      title: "Vai trò hiển thị",
      description: "Quản lý Role (vai trò hiển thị) cho Media DAM và SEO asset discovery.",
    },
  },
  {
    path: "/admin/content/media-collections",
    meta: {
      breadcrumbs: ["MEDIA", "Bộ sưu tập"],
      title: "Bộ sưu tập",
      description: "Nhóm ảnh theo dự án, chiến dịch, khách hàng hoặc sáng kiến nội dung.",
    },
  },
  {
    path: "/admin/content/media-vocabulary",
    meta: {
      breadcrumbs: ["MEDIA", "Từ điển metadata"],
      title: "Từ điển metadata",
      description: "Chuẩn hóa chủ thể, chất liệu, màu sắc và các thuật ngữ mô tả dùng cho ảnh.",
    },
  },
  {
    path: "/admin/content/media-bundles",
    meta: {
      breadcrumbs: ["MEDIA", "Gói hình ảnh"],
      title: "Gói hình ảnh",
      description: "Quản lý bộ ảnh theo vị trí (slot) cho từng loại nội dung: blog, landing page, sản phẩm...",
    },
  },
  {
    path: "/admin/content/media-coverage",
    meta: {
      breadcrumbs: ["MEDIA", "Độ phủ hình ảnh"],
      title: "Độ phủ hình ảnh",
      description: "Lập kế hoạch và kiểm tra độ phủ ảnh sẵn có trước khi tạo nội dung mới.",
    },
  },

  // ── WEBSITE ────────────────────────────────────────────────
  {
    path: "/admin/settings/homepage",
    meta: {
      breadcrumbs: ["WEBSITE", "Homepage"],
      title: "Homepage",
      description: "Quản lý nội dung chính hiển thị trên trang chủ public website.",
    },
  },
  {
    path: "/admin/site-navigation",
    meta: {
      breadcrumbs: ["WEBSITE", "Điều hướng & Footer"],
      title: "Điều hướng & Footer",
      description: "Quản lý menu header, footer, CTA và thanh cuối footer trên website công khai.",
    },
  },
  {
    path: "/admin/client-logos",
    meta: {
      breadcrumbs: ["WEBSITE", "Logo khách hàng"],
      title: "Logo khách hàng",
      description: "Quản lý logo khách hàng và social proof hiển thị trên website.",
    },
  },

  // ── KNOWLEDGE & AI ─────────────────────────────────────────
  {
    path: "/admin/knowledge-base/context-preview",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Prompt & Context"],
      title: "Prompt & Context",
      description: "Xem trước ngữ cảnh và prompt dùng cho AI trong CMS.",
    },
  },
  {
    path: "/admin/knowledge-base",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Knowledge Base"],
      title: "Knowledge Base",
      description: "Quản lý tri thức nội bộ phục vụ vận hành, content và AI assistant.",
    },
  },
  {
    path: "/admin/knowledge-graph/relationships",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Knowledge Graph", "Quan hệ"],
      title: "Quan hệ Knowledge Graph",
      description: "Quản lý hàng đợi và quan hệ trong Knowledge Graph.",
    },
  },
  {
    path: "/admin/knowledge-graph/evaluation",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Knowledge Graph", "Đánh giá"],
      title: "Đánh giá Knowledge Graph",
      description: "Đánh giá chất lượng retrieval và curation của Knowledge Graph.",
    },
  },
  {
    path: "/admin/knowledge-graph",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Knowledge Graph"],
      title: "Knowledge Graph",
      description: "Quản lý lớp Knowledge Graph phục vụ AI và nội dung.",
    },
  },
  {
    path: "/admin/content/ai-retrieval",
    meta: {
      breadcrumbs: ["KNOWLEDGE & AI", "Kiểm tra ngữ cảnh AI"],
      title: "Kiểm tra ngữ cảnh AI",
      description: "Xem trước ngữ cảnh retrieval mà các hệ thống AI tương lai sẽ nhận — không gọi LLM.",
    },
  },

  // ── VẬN HÀNH ───────────────────────────────────────────────
  {
    path: "/admin/operations",
    meta: {
      breadcrumbs: ["VẬN HÀNH", "Tổng quan vận hành"],
      title: "Tổng quan vận hành",
      description: "Theo dõi trạng thái vận hành, đơn hàng và công việc nội bộ.",
    },
  },
  {
    path: "/admin/delivery",
    meta: {
      breadcrumbs: ["VẬN HÀNH", "Giao hàng"],
      title: "Giao hàng",
      description: "Theo dõi giao hàng, vận chuyển và trạng thái bàn giao.",
    },
  },
  {
    path: "/admin/employees",
    meta: {
      breadcrumbs: ["VẬN HÀNH", "Nhân viên"],
      title: "Nhân viên",
      description: "Quản lý nhân sự nội bộ liên quan đến quy trình vận hành CMS.",
    },
  },
  {
    path: "/admin/materials/warehouse",
    meta: {
      breadcrumbs: ["VẬN HÀNH", "Tồn kho"],
      title: "Tồn kho",
      description: "Theo dõi tồn kho vật liệu, sản phẩm và dữ liệu warehouse.",
    },
  },

  // ── BÁO CÁO ────────────────────────────────────────────────
  {
    path: "/admin/crm/revenue-categories",
    meta: {
      breadcrumbs: ["BÁO CÁO", "Báo cáo doanh thu"],
      title: "Báo cáo doanh thu",
      description: "Theo dõi nhóm doanh thu và dữ liệu tài chính phục vụ báo cáo.",
    },
  },
  {
    path: "/admin/crm/sales",
    meta: {
      breadcrumbs: ["BÁO CÁO", "Báo cáo bán hàng"],
      title: "Báo cáo bán hàng",
      description: "Tổng hợp dữ liệu bán hàng, doanh số và hiệu suất thương mại.",
    },
  },
  {
    path: "/admin/crm/reports",
    meta: {
      breadcrumbs: ["BÁO CÁO", "Báo cáo CRM"],
      title: "Báo cáo CRM",
      description: "Phân tích dữ liệu lead, khách hàng và hoạt động chăm sóc.",
    },
  },

  // ── HỆ THỐNG ───────────────────────────────────────────────
  {
    path: "/admin/settings/users",
    meta: {
      breadcrumbs: ["HỆ THỐNG", "Users"],
      title: "Users",
      description: "Quản lý tài khoản người dùng có quyền truy cập CMS.",
    },
  },
  {
    path: "/admin/settings/roles",
    meta: {
      breadcrumbs: ["HỆ THỐNG", "Roles"],
      title: "Roles",
      description: "Quản lý vai trò và quyền truy cập theo phân quyền nội bộ.",
    },
  },
  {
    path: "/admin/settings/company",
    meta: {
      breadcrumbs: ["HỆ THỐNG", "Thông tin công ty"],
      title: "Thông tin công ty",
      description: "Quản lý thông tin công ty dùng trong tài liệu và cấu hình CMS.",
    },
  },
  {
    path: "/admin/settings/branding",
    meta: {
      breadcrumbs: ["HỆ THỐNG", "Branding"],
      title: "Branding",
      description: "Quản lý nhận diện thương hiệu và cấu hình hiển thị liên quan.",
    },
  },
  {
    path: "/admin/settings/trust",
    meta: {
      breadcrumbs: ["HỆ THỐNG", "Cấu hình hệ thống"],
      title: "Cấu hình hệ thống",
      description: "Quản lý cấu hình tin cậy, thông tin hệ thống và thiết lập chung.",
    },
  },
];

function specificityScore(path: string): number {
  const segments = path.split("/").filter(Boolean);
  const paramCount = segments.filter((segment) => segment.startsWith(":")).length;
  // More segments win; fewer params win when segment count ties.
  return segments.length * 100 - paramCount;
}

function matchParamPath(pathname: string, pattern: string): boolean {
  const pathParts = pathname.split("/");
  const patternParts = pattern.split("/");
  if (pathParts.length !== patternParts.length) return false;
  return patternParts.every(
    (part, index) => part.startsWith(":") || part === pathParts[index],
  );
}

function matchesRule(pathname: string, rule: AdminBreadcrumbRule): boolean {
  if (rule.path.includes(":")) {
    return matchParamPath(pathname, rule.path);
  }
  // Exact-only for /admin so it does not swallow every admin descendant.
  if (rule.path === "/admin") {
    return pathname === "/admin";
  }
  return pathname === rule.path || pathname.startsWith(`${rule.path}/`);
}

const sortedRules = [...breadcrumbRules].sort((a, b) => {
  const scoreDiff = specificityScore(b.path) - specificityScore(a.path);
  if (scoreDiff !== 0) return scoreDiff;
  return b.path.length - a.path.length;
});

export function getAdminBreadcrumbMeta(pathname: string): AdminBreadcrumbMeta {
  const matchedRule = sortedRules.find((rule) => matchesRule(pathname, rule));

  if (matchedRule) return matchedRule.meta;

  return {
    breadcrumbs: ["CMS"],
    title: "ATTD CMS",
    description: "Quản trị dữ liệu, nội dung và vận hành nội bộ của ATTD.",
  };
}
