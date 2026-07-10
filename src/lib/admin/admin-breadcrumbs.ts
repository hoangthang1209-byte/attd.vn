export type AdminBreadcrumbMeta = {
  breadcrumbs: string[];
  title: string;
  description: string;
};

type AdminBreadcrumbRule = {
  path: string;
  meta: AdminBreadcrumbMeta;
};

const breadcrumbRules: AdminBreadcrumbRule[] = [
  {
    path: "/admin/dashboard",
    meta: {
      breadcrumbs: ["Tổng quan"],
      title: "Dashboard",
      description: "Theo dõi nhanh tình hình vận hành, thương mại và hệ thống CMS.",
    },
  },
  {
    path: "/admin/crm/leads",
    meta: {
      breadcrumbs: ["Thương mại", "Lead"],
      title: "Quản lý lead",
      description: "Tiếp nhận, phân loại và theo dõi cơ hội bán hàng mới.",
    },
  },
  {
    path: "/admin/crm/customers",
    meta: {
      breadcrumbs: ["Thương mại", "Khách hàng"],
      title: "Khách hàng",
      description: "Quản lý hồ sơ công ty, người liên hệ và lịch sử chăm sóc.",
    },
  },
  {
    path: "/admin/crm/whatsapp-assistant",
    meta: {
      breadcrumbs: ["Thương mại", "AI Assistant"],
      title: "AI Assistant",
      description: "Hỗ trợ phân tích hội thoại và tạo dữ liệu bán hàng từ trao đổi khách hàng.",
    },
  },
  {
    path: "/admin/crm/revenue-categories",
    meta: {
      breadcrumbs: ["Business Intelligence", "Revenue"],
      title: "Revenue",
      description: "Theo dõi nhóm doanh thu và dữ liệu tài chính phục vụ báo cáo.",
    },
  },
  {
    path: "/admin/crm/sales",
    meta: {
      breadcrumbs: ["Business Intelligence", "Sales"],
      title: "Sales Report",
      description: "Tổng hợp dữ liệu bán hàng, doanh số và hiệu suất thương mại.",
    },
  },
  {
    path: "/admin/crm/reports",
    meta: {
      breadcrumbs: ["Business Intelligence", "CRM"],
      title: "CRM Report",
      description: "Phân tích dữ liệu lead, khách hàng và hoạt động chăm sóc.",
    },
  },
  {
    path: "/admin/crm",
    meta: {
      breadcrumbs: ["Thương mại", "CRM Pipeline"],
      title: "CRM Pipeline",
      description: "Theo dõi pipeline bán hàng và trạng thái xử lý khách hàng.",
    },
  },
  {
    path: "/admin/sales/follow-up",
    meta: {
      breadcrumbs: ["Thương mại", "Follow-up"],
      title: "Follow-up",
      description: "Theo dõi các việc cần chăm sóc tiếp theo trong quy trình bán hàng.",
    },
  },
  {
    path: "/admin/sales/pipeline",
    meta: {
      breadcrumbs: ["Thương mại", "Pipeline bán hàng"],
      title: "Pipeline bán hàng",
      description: "Quản lý các cơ hội thương mại theo giai đoạn bán hàng.",
    },
  },
  {
    path: "/admin/quotes",
    meta: {
      breadcrumbs: ["Thương mại", "Báo giá"],
      title: "Quản lý báo giá",
      description: "Tạo, gửi và theo dõi báo giá khách hàng.",
    },
  },
  {
    path: "/admin/pricing/price-groups",
    meta: {
      breadcrumbs: ["Đại lý / B2B", "Bảng giá đại lý"],
      title: "Bảng giá đại lý",
      description: "Quản lý nhóm giá và chính sách giá dành cho đại lý.",
    },
  },
  {
    path: "/admin/pricing/product-tiers",
    meta: {
      breadcrumbs: ["Sản phẩm", "Bảng giá sản phẩm"],
      title: "Bảng giá sản phẩm",
      description: "Quản lý tầng giá theo sản phẩm, biến thể và số lượng.",
    },
  },
  {
    path: "/admin/pricing",
    meta: {
      breadcrumbs: ["Thương mại", "Bảng giá"],
      title: "Pricing Engine",
      description: "Tính giá, kiểm tra biên lợi nhuận và chuẩn hóa báo giá.",
    },
  },
  {
    path: "/admin/orders",
    meta: {
      breadcrumbs: ["Thương mại", "Đơn hàng"],
      title: "Đơn hàng",
      description: "Theo dõi đơn hàng đã chốt và trạng thái xử lý liên quan.",
    },
  },
  {
    path: "/admin/products/import",
    meta: {
      breadcrumbs: ["Sản phẩm", "Import / Export"],
      title: "Import / Export",
      description: "Nhập, xuất và cập nhật dữ liệu catalog theo lô.",
    },
  },
  {
    path: "/admin/products",
    meta: {
      breadcrumbs: ["Sản phẩm", "Sản phẩm"],
      title: "Sản phẩm",
      description: "Quản lý catalog sản phẩm, nội dung bán hàng và trạng thái hiển thị.",
    },
  },
  {
    path: "/admin/danh-muc",
    meta: {
      breadcrumbs: ["Sản phẩm", "Danh mục"],
      title: "Danh mục",
      description: "Quản lý cấu trúc danh mục sản phẩm trên website và CMS.",
    },
  },
  {
    path: "/admin/variant",
    meta: {
      breadcrumbs: ["Sản phẩm", "SKU / Biến thể"],
      title: "SKU / Biến thể",
      description: "Quản lý SKU, màu sắc, size và các tổ hợp biến thể sản phẩm.",
    },
  },
  {
    path: "/admin/attributes",
    meta: {
      breadcrumbs: ["Sản phẩm", "Thuộc tính"],
      title: "Thuộc tính sản phẩm",
      description: "Chuẩn hóa các thuộc tính dùng cho catalog và biến thể.",
    },
  },
  {
    path: "/admin/media",
    meta: {
      breadcrumbs: ["Sản phẩm", "Thư viện ảnh"],
      title: "Thư viện ảnh",
      description: "Quản lý hình ảnh sản phẩm, nội dung website và tài sản truyền thông.",
    },
  },
  {
    path: "/admin/tech-pack",
    meta: {
      breadcrumbs: ["Kỹ thuật sản phẩm", "Tech Pack"],
      title: "Tech Pack",
      description: "Quản lý tài liệu kỹ thuật phục vụ phát triển mẫu và sản xuất.",
    },
  },
  {
    path: "/admin/pattern",
    meta: {
      breadcrumbs: ["Kỹ thuật sản phẩm", "Thư viện rập"],
      title: "Thư viện rập",
      description: "Quản lý rập, thông số và dữ liệu kỹ thuật theo sản phẩm.",
    },
  },
  {
    path: "/admin/measurement-template",
    meta: {
      breadcrumbs: ["Kỹ thuật sản phẩm", "Mẫu thông số"],
      title: "Mẫu thông số",
      description: "Chuẩn hóa bộ thông số đo dùng cho tech pack và pattern.",
    },
  },
  {
    path: "/admin/production-materials",
    meta: {
      breadcrumbs: ["Kỹ thuật sản phẩm", "Vật liệu"],
      title: "Vật liệu",
      description: "Quản lý thư viện nguyên vật liệu phục vụ BOM và sản xuất.",
    },
  },
  {
    path: "/admin/trims",
    meta: {
      breadcrumbs: ["Kỹ thuật sản phẩm", "Phụ liệu"],
      title: "Phụ liệu",
      description: "Quản lý phụ liệu, nhãn, bo, dây kéo và chi tiết hoàn thiện sản phẩm.",
    },
  },
  {
    path: "/admin/production-suppliers",
    meta: {
      breadcrumbs: ["Sản xuất", "Nhà cung cấp sản xuất"],
      title: "Nhà cung cấp sản xuất",
      description: "Quản lý nhà cung cấp phục vụ sản xuất, gia công và nguyên liệu.",
    },
  },
  {
    path: "/admin/production",
    meta: {
      breadcrumbs: ["Sản xuất", "Lệnh sản xuất"],
      title: "Lệnh sản xuất",
      description: "Theo dõi lệnh sản xuất và các trạng thái vận hành liên quan.",
    },
  },
  {
    path: "/admin/print-methods",
    meta: {
      breadcrumbs: ["Sản xuất", "Công nghệ in / thêu"],
      title: "Công nghệ in / thêu",
      description: "Quản lý thư viện phương pháp in, thêu và hoàn thiện sản phẩm.",
    },
  },
  {
    path: "/admin/dealer/rfqs",
    meta: {
      breadcrumbs: ["Đại lý / B2B", "RFQ"],
      title: "RFQ",
      description: "Theo dõi yêu cầu báo giá từ đại lý và khách B2B.",
    },
  },
  {
    path: "/admin/dealer",
    meta: {
      breadcrumbs: ["Đại lý / B2B", "Công ty đại lý"],
      title: "Công ty đại lý",
      description: "Quản lý hồ sơ đại lý, trạng thái hợp tác và dữ liệu B2B.",
    },
  },
  {
    path: "/admin/settings/homepage",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Homepage"],
      title: "Homepage",
      description: "Quản lý nội dung chính hiển thị trên trang chủ public website.",
    },
  },
  {
    path: "/admin/site-navigation",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Điều hướng và Footer"],
      title: "Điều hướng và Footer",
      description: "Quản lý menu header, footer, CTA và thanh cuối footer trên website công khai.",
    },
  },
  {
    path: "/admin/landing-pages",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Landing Page"],
      title: "Landing Page",
      description: "Quản lý các trang landing phục vụ SEO, chiến dịch và chuyển đổi.",
    },
  },
  {
    path: "/admin/blog",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Blog"],
      title: "Blog",
      description: "Quản lý bài viết, nội dung SEO và truyền thông thương hiệu.",
    },
  },
  {
    path: "/admin/case-studies",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Case Study"],
      title: "Case Study",
      description: "Quản lý dự án tiêu biểu và bằng chứng năng lực trên website.",
    },
  },
  {
    path: "/admin/client-logos",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Client Logo"],
      title: "Client Logo",
      description: "Quản lý logo khách hàng và social proof hiển thị trên website.",
    },
  },
  {
    path: "/admin/seo-planning",
    meta: {
      breadcrumbs: ["Nội dung & Website", "SEO"],
      title: "SEO Planning",
      description: "Quản lý kế hoạch SEO, campaign và nội dung tăng trưởng organic.",
    },
  },
  {
    path: "/admin/knowledge-base/context-preview",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Knowledge", "Prompt Library"],
      title: "Prompt Library",
      description: "Xem trước ngữ cảnh và prompt dùng cho AI trong CMS.",
    },
  },
  {
    path: "/admin/knowledge-base",
    meta: {
      breadcrumbs: ["Nội dung & Website", "Knowledge Base"],
      title: "Knowledge Base",
      description: "Quản lý tri thức nội bộ phục vụ vận hành, content và AI assistant.",
    },
  },
  {
    path: "/admin/operations",
    meta: {
      breadcrumbs: ["Vận hành", "Dashboard vận hành"],
      title: "Dashboard vận hành",
      description: "Theo dõi trạng thái vận hành, đơn hàng và công việc nội bộ.",
    },
  },
  {
    path: "/admin/delivery",
    meta: {
      breadcrumbs: ["Vận hành", "Giao hàng"],
      title: "Giao hàng",
      description: "Theo dõi giao hàng, vận chuyển và trạng thái bàn giao.",
    },
  },
  {
    path: "/admin/employees",
    meta: {
      breadcrumbs: ["Vận hành", "Nhân viên"],
      title: "Nhân viên",
      description: "Quản lý nhân sự nội bộ liên quan đến quy trình vận hành CMS.",
    },
  },
  {
    path: "/admin/materials/warehouse",
    meta: {
      breadcrumbs: ["Sản phẩm", "Tồn kho"],
      title: "Tồn kho",
      description: "Theo dõi tồn kho vật liệu, sản phẩm và dữ liệu warehouse.",
    },
  },
  {
    path: "/admin/settings/users",
    meta: {
      breadcrumbs: ["Hệ thống", "Users"],
      title: "Users",
      description: "Quản lý tài khoản người dùng có quyền truy cập CMS.",
    },
  },
  {
    path: "/admin/settings/roles",
    meta: {
      breadcrumbs: ["Hệ thống", "Roles & Permissions"],
      title: "Roles & Permissions",
      description: "Quản lý vai trò và quyền truy cập theo phân quyền nội bộ.",
    },
  },
  {
    path: "/admin/settings/company",
    meta: {
      breadcrumbs: ["Hệ thống", "Công ty"],
      title: "Công ty",
      description: "Quản lý thông tin công ty dùng trong tài liệu và cấu hình CMS.",
    },
  },
  {
    path: "/admin/settings/branding",
    meta: {
      breadcrumbs: ["Hệ thống", "Branding"],
      title: "Branding",
      description: "Quản lý nhận diện thương hiệu và cấu hình hiển thị liên quan.",
    },
  },
  {
    path: "/admin/settings/trust",
    meta: {
      breadcrumbs: ["Hệ thống", "Cấu hình"],
      title: "Cấu hình",
      description: "Quản lý cấu hình tin cậy, thông tin hệ thống và thiết lập chung.",
    },
  },
];

const sortedRules = [...breadcrumbRules].sort((a, b) => b.path.length - a.path.length);

export function getAdminBreadcrumbMeta(pathname: string): AdminBreadcrumbMeta {
  const matchedRule = sortedRules.find(
    (rule) => pathname === rule.path || pathname.startsWith(`${rule.path}/`),
  );

  if (matchedRule) return matchedRule.meta;

  return {
    breadcrumbs: ["CMS"],
    title: "ATTD CMS",
    description: "Quản trị dữ liệu, nội dung và vận hành nội bộ của ATTD.",
  };
}
