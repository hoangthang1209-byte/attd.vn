import type { KnowledgeBaseEntryType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createKnowledgeBaseEntry,
  ensureDefaultKnowledgeCategories,
  getCategoryIdBySlug,
} from "@/features/knowledge-base/knowledge-base-seed";
import { generateKnowledgeBaseSlug } from "@/features/knowledge-base/knowledge-base-utils";

type StarterEntry = {
  title: string;
  summary: string;
  content: string;
  categorySlug: string;
  type: KnowledgeBaseEntryType;
  usageScope: string[];
  tags: string[];
  structuredData?: Record<string, unknown>;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  isVerified?: boolean;
};

const STARTER_ENTRIES: StarterEntry[] = [
  // ─── COMPANY ─────────────────────────────────────────────────────────────
  {
    title: "ATTD — Tổng quan thương hiệu",
    summary:
      "ATTD.vn là kho sỉ đồng phục và quà tặng doanh nghiệp B2B tại Việt Nam — không phải dịch vụ in lẻ.",
    content:
      "ATTD.vn (attd.vn) định vị là nền tảng B2B chuyên cung cấp nguồn hàng sỉ áo thun trơn, áo polo, đồng phục doanh nghiệp và quà tặng doanh nghiệp. Khách hàng mục tiêu: đại lý bán sỉ, xưởng in, agency quà tặng, doanh nghiệp mua số lượng lớn. ATTD KHÔNG phải dịch vụ in áo lẻ hay in 1 cái. ATTD hỗ trợ OEM/private label và giao hàng toàn quốc. Thương hiệu legacy trong hệ sinh thái: Áo Thun Thông Điệp (aothunthongdiep.com) chuyên dịch vụ in theo yêu cầu.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["ATTD", "B2B", "kho sỉ", "định vị thương hiệu"],
    priority: "HIGH",
    isVerified: true,
  },
  {
    title: "ATTD.vn — Định vị kho sỉ đồng phục B2B",
    summary:
      "ATTD.vn = kho sỉ đồng phục & quà tặng doanh nghiệp. Phân biệt rõ với dịch vụ in lẻ.",
    content:
      "ATTD.vn là kho sỉ đồng phục và quà tặng doanh nghiệp (B2B wholesale). Đây là điểm phân biệt quan trọng:\n\n- ATTD.vn = Nguồn hàng sỉ, OEM, quà tặng doanh nghiệp số lượng lớn\n- Aothunthongdiep.com = In theo yêu cầu, in áo số lượng nhỏ\n\nKhách hàng ATTD:\n- Đại lý bán sỉ quần áo\n- Xưởng in cần nguồn hàng áo blank\n- Agency chuyên quà tặng doanh nghiệp\n- Doanh nghiệp mua đồng phục số lượng lớn (từ vài chục đến vài nghìn cái)\n- Reseller/dropshipper nguồn hàng thời trang B2B\n\nATTD không tập trung vào: in 1 áo, in số lượng ít, retail lẻ.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING", "SALES"],
    tags: ["kho sỉ", "B2B", "định vị", "phân biệt thương hiệu"],
    priority: "HIGH",
    isVerified: true,
  },
  {
    title: "Thương hiệu legacy: Áo Thun Thông Điệp",
    summary:
      "Áo Thun Thông Điệp (aothunthongdiep.com) là thương hiệu legacy chuyên in theo yêu cầu — khác với ATTD.vn sỉ.",
    content:
      "Áo Thun Thông Điệp (aothunthongdiep.com) là thương hiệu trong hệ sinh thái ATTD, tập trung dịch vụ in áo theo yêu cầu, in số lượng nhỏ và phục vụ retail. ATTD.vn là nền tảng B2B wholesale riêng biệt, không thay thế aothunthongdiep.com. Khi viết nội dung về ATTD.vn, không dùng từ khóa 'in áo theo yêu cầu' hay 'in lẻ' như định vị chính — đó là positioning của aothunthongdiep.com.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI"],
    tags: ["legacy", "aothunthongdiep", "phân biệt"],
    isVerified: true,
  },
  {
    title: "Đối tượng khách hàng B2B của ATTD",
    summary:
      "Khách hàng ATTD: đại lý sỉ, xưởng in, agency quà tặng, doanh nghiệp mua đồng phục số lượng lớn.",
    content:
      "Phân khúc khách hàng chính của ATTD.vn:\n\n1. Đại lý bán sỉ: Mua áo blank số lượng lớn để bán lại hoặc kết hợp dịch vụ in.\n2. Xưởng in & embroidery: Cần nguồn hàng áo trơn ổn định, giao hàng nhanh, MOQ linh hoạt.\n3. Agency quà tặng doanh nghiệp: Tìm nguồn hàng combo quà (áo, nón, tote bag, bình giữ nhiệt) để đặt OEM theo brief doanh nghiệp.\n4. Doanh nghiệp & tổ chức: Mua đồng phục công ty, quà tặng sự kiện, kit nhân viên mới.\n5. Reseller/dropshipper: Nguồn hàng thời trang B2B, cần giá sỉ và hỗ trợ dropship.\n\nATTD hỗ trợ tư vấn chọn sản phẩm, mẫu thử, báo giá theo số lượng và phương án OEM.",
    categorySlug: "company",
    type: "COMPANY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING", "SALES", "CRM"],
    tags: ["khách hàng B2B", "đại lý", "agency", "xưởng in", "reseller"],
    priority: "HIGH",
    isVerified: true,
  },
  // ─── PRODUCTS & MATERIALS ─────────────────────────────────────────────────
  {
    title: "Nguồn hàng áo thun trơn sỉ tại ATTD",
    summary:
      "ATTD cung cấp nguồn hàng áo thun trơn sỉ: cotton, CVC, TC — phù hợp xưởng in và đại lý.",
    content:
      "ATTD.vn cung cấp nguồn hàng áo thun trơn sỉ với nhiều dòng chất liệu:\n\n- Cotton 100%: Mềm, thoáng khí, phù hợp đồng phục và quà tặng cao cấp\n- CVC (Cotton Viscose Combination): Kháng nhăn, giữ form tốt, phổ biến cho đồng phục doanh nghiệp\n- TC (Teteron Cotton): Giá cạnh tranh, bền màu, phù hợp in sublimation và đồng phục phổ thông\n\nKích cỡ: XS đến 5XL, size curve theo thị trường Việt Nam.\nMàu sắc: Trắng, đen, xám, navy và các màu basic cơ bản.\nMOQ: Theo nhóm sản phẩm — liên hệ để nhận bảng giá sỉ chi tiết.\nỨng dụng: Làm blank cho xưởng in, đồng phục doanh nghiệp, bán lại, quà tặng.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["áo thun trơn", "nguồn hàng sỉ", "cotton", "CVC", "TC", "blank áo"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      materials: ["Cotton 100%", "CVC", "TC"],
      sizes: "XS–5XL",
      useCases: ["Xưởng in", "Đại lý sỉ", "Đồng phục doanh nghiệp", "Quà tặng"],
      moqNote: "Liên hệ để nhận bảng giá sỉ chi tiết",
    },
  },
  {
    title: "Nguồn hàng áo polo trơn sỉ tại ATTD",
    summary:
      "Áo polo trơn sỉ cho đồng phục doanh nghiệp, F&B, nhân viên bán hàng — đặt hàng số lượng lớn.",
    content:
      "ATTD.vn cung cấp nguồn hàng áo polo trơn cho:\n- Đồng phục doanh nghiệp, ngân hàng, công ty tài chính\n- Nhân viên cửa hàng bán lẻ, F&B, nhà hàng\n- Đồng phục nhân viên sự kiện, hội nghị\n- In/thêu logo theo yêu cầu OEM\n\nChất liệu phổ biến: Cotton pique, CVC pique, poly pique.\nCổ áo: Polo cổ bẻ truyền thống, cổ đứng (mandarin), cổ tròn.\nSize: S đến 3XL.\nATTD hỗ trợ may OEM form riêng, thêu logo, in nhiệt và in lụa trên áo polo.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["áo polo", "polo trơn sỉ", "đồng phục công ty", "OEM polo"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      materials: ["Cotton pique", "CVC pique", "Poly pique"],
      sizes: "S–3XL",
      useCases: ["Đồng phục doanh nghiệp", "F&B", "Sự kiện", "OEM"],
    },
  },
  {
    title: "Nguồn hàng áo khoác đồng phục sỉ",
    summary:
      "Áo khoác đồng phục sỉ: windbreaker, bomber, hoodie — phù hợp đồng phục team và quà tặng.",
    content:
      "ATTD.vn cung cấp nguồn hàng áo khoác dùng làm đồng phục và quà tặng doanh nghiệp:\n\n- Windbreaker (áo gió): Nhẹ, chống gió, in/thêu logo 2 mặt\n- Bomber jacket: Phù hợp sự kiện, team building, đồng phục agency\n- Hoodie/sweatshirt: Cotton fleece hoặc cotton nỉ, phổ biến quà tặng corporate\n- Áo khoác dù lót bông: Mùa lạnh, phù hợp quà tặng tết doanh nghiệp\n\nMOQ tùy dòng sản phẩm — liên hệ ATTD để nhận báo giá sỉ và mẫu thử.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["áo khoác", "đồng phục sỉ", "windbreaker", "hoodie", "bomber"],
    priority: "MEDIUM",
    structuredData: {
      types: ["Windbreaker", "Bomber", "Hoodie", "Áo khoác dù"],
      useCases: ["Đồng phục team", "Quà tặng tết", "Sự kiện"],
    },
  },
  {
    title: "Nón đồng phục sỉ tại ATTD",
    summary:
      "Nón đồng phục sỉ: nón lưỡi trai, bucket hat, nón kết — nguồn hàng cho agency và doanh nghiệp.",
    content:
      "ATTD.vn cung cấp nón đồng phục sỉ dùng cho:\n- Đồng phục nhân viên F&B, cửa hàng, sự kiện ngoài trời\n- Quà tặng doanh nghiệp kết hợp áo thun (combo)\n- Team building, hội chợ triển lãm\n- In/thêu logo lên nón theo yêu cầu\n\nLoại nón phổ biến tại ATTD:\n- Nón lưỡi trai (baseball cap) — vải cotton, polyester, denim\n- Bucket hat (nón tai bèo) — cotton, canvas\n- Nón kết — cứng, phù hợp đồng phục công ty\n\nMOQ: Liên hệ ATTD để nhận báo giá sỉ. Hỗ trợ thêu logo, in logo (in nhiệt/in lụa).",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["nón đồng phục", "nón sỉ", "bucket hat", "baseball cap", "quà tặng"],
    priority: "MEDIUM",
    isVerified: true,
    structuredData: {
      types: ["Nón lưỡi trai", "Bucket hat", "Nón kết"],
      useCases: ["Đồng phục", "Quà tặng", "Sự kiện"],
    },
  },
  {
    title: "Tote bag sỉ — Nguồn hàng quà tặng doanh nghiệp",
    summary:
      "Tote bag sỉ: túi vải canvas, túi không dệt, túi kraft — in logo theo yêu cầu, giao sỉ số lượng lớn.",
    content:
      "ATTD.vn cung cấp tote bag sỉ dùng trong quà tặng doanh nghiệp và marketing:\n\n- Túi tote canvas: Bền, tái sử dụng nhiều lần, in logo offset hoặc lụa\n- Túi không dệt (non-woven): Giá cạnh tranh, phù hợp sự kiện số lượng lớn, in 1–2 màu\n- Túi kraft giấy: Sang trọng, phù hợp packaging cao cấp\n\nỨng dụng:\n- Túi đựng quà tặng nhân viên/đối tác\n- Túi marketing cho hội nghị, triển lãm\n- Combo quà tặng kết hợp áo, nón, bình giữ nhiệt\n\nHỗ trợ in logo, thêu, in màu theo brief. MOQ: Liên hệ để nhận báo giá sỉ.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["tote bag", "túi tote sỉ", "quà tặng doanh nghiệp", "canvas bag"],
    priority: "MEDIUM",
    isVerified: true,
    structuredData: {
      types: ["Tote canvas", "Non-woven bag", "Túi kraft"],
      useCases: ["Quà tặng", "Marketing", "Sự kiện"],
    },
  },
  {
    title: "Bình giữ nhiệt sỉ — Quà tặng doanh nghiệp",
    summary:
      "Bình giữ nhiệt sỉ: bình inox, bình nhựa — in logo khắc laser hoặc in UV, phổ biến quà tặng doanh nghiệp.",
    content:
      "ATTD.vn cung cấp bình giữ nhiệt sỉ dùng làm quà tặng doanh nghiệp:\n\n- Bình inox 500ml/750ml: Giữ nhiệt 12–24h, sang trọng, khắc laser logo\n- Bình nhựa tritan BPA-free: Nhẹ, an toàn, phù hợp quà tặng sức khỏe\n- Bình thủy tinh có sleeve: Cao cấp, dành cho gift set premium\n\nỨng dụng phổ biến:\n- Quà tặng nhân viên mới (onboarding kit)\n- Quà tặng đối tác dịp tết/sự kiện\n- Combo gift set cùng áo polo, tote bag\n\nHỗ trợ khắc laser, in UV, dán decal. Đóng gói theo brief thương hiệu. MOQ: Liên hệ ATTD.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI", "SEO_PLANNING"],
    tags: ["bình giữ nhiệt sỉ", "quà tặng doanh nghiệp", "inox", "gift set"],
    priority: "MEDIUM",
    isVerified: true,
    structuredData: {
      types: ["Bình inox", "Bình tritan", "Bình thủy tinh"],
      useCases: ["Onboarding kit", "Quà tặng tết", "Gift set B2B"],
    },
  },
  {
    title: "Quà tặng doanh nghiệp sỉ — Combo & Gift Set",
    summary:
      "ATTD cung cấp combo quà tặng doanh nghiệp sỉ: áo thun + nón + tote bag + bình giữ nhiệt — đóng gói theo brief.",
    content:
      "ATTD.vn chuyên cung cấp quà tặng doanh nghiệp B2B theo hướng nguồn hàng sỉ và OEM:\n\n- Combo cơ bản: Áo polo/thun + Túi tote canvas\n- Combo premium: Áo polo + Bình giữ nhiệt inox + Nón + Tote bag\n- Gift set tết: Áo khoác/polo + Bình giữ nhiệt + Hộp quà branded\n- Kit nhân viên mới (onboarding): Áo polo + Tote bag + Sổ tay + Bút\n\nQuy trình đặt hàng quà tặng doanh nghiệp tại ATTD:\n1. Tư vấn brief (số lượng, ngân sách, thông điệp)\n2. Chọn combo sản phẩm\n3. Thiết kế mocking logo trên sản phẩm\n4. Xác nhận mẫu thử\n5. Sản xuất & đóng gói\n6. Giao hàng toàn quốc\n\nHỗ trợ in/thêu logo, đóng hộp branded, giao hàng theo lịch sự kiện.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["quà tặng doanh nghiệp", "gift set", "combo quà tặng", "corporate gift sỉ"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      combos: ["Cơ bản", "Premium", "Gift set tết", "Onboarding kit"],
      process: ["Brief", "Chọn combo", "Mocking", "Mẫu thử", "Sản xuất", "Giao hàng"],
    },
  },
  {
    title: "Nhóm sản phẩm: Bandana & Khăn đồng phục",
    summary: "Bandana, khăn cổ, khăn bandana sỉ — dùng cho event, team building, quà tặng B2B.",
    categorySlug: "products-materials",
    type: "PRODUCT",
    usageScope: ["BLOG_AI", "PRODUCT_AI"],
    tags: ["bandana", "khăn đồng phục", "phụ kiện sỉ"],
    content:
      "Bandana và khăn đồng phục sỉ tại ATTD phù hợp cho:\n- Sự kiện ngoài trời, marathon, team building\n- Combo quà tặng phong trào và youth marketing\n- Đồng phục nhân viên F&B và chuỗi cửa hàng\n\nChất liệu: Cotton, microfiber, poly. In sublimation full màu hoặc in lụa 1–2 màu.",
  },
  // ─── MANUFACTURING & OEM ─────────────────────────────────────────────────
  {
    title: "Dịch vụ OEM & Private Label tại ATTD",
    summary: "ATTD hỗ trợ OEM, private label — may, in, thêu, tem mác, đóng gói theo yêu cầu.",
    categorySlug: "manufacturing-oem",
    type: "OEM",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SEO_PLANNING"],
    tags: ["OEM", "private label", "may theo yêu cầu"],
    content:
      "ATTD.vn hỗ trợ OEM/private label cho doanh nghiệp và đại lý:\n\n- May theo form riêng (pattern/cut theo brief)\n- In lụa, in nhiệt, in kỹ thuật số, sublimation\n- Thêu logo (embroidery)\n- Gắn tem mác thương hiệu riêng (private label)\n- Đóng gói cá nhân hóa (polybag, hộp cứng, túi giấy)\n\nQuy trình OEM:\n1. Nhận brief sản phẩm\n2. Tư vấn chất liệu, form, phương pháp in/thêu\n3. Sản xuất mẫu (sample)\n4. Xác nhận mẫu → Sản xuất đại trà\n5. QC → Đóng gói → Giao hàng\n\nMOQ và lead time phụ thuộc sản phẩm — liên hệ ATTD để nhận báo giá chính xác.",
    structuredData: {
      services: ["May OEM", "In lụa", "In nhiệt", "Sublimation", "Thêu logo", "Private label", "Đóng gói"],
      process: ["Brief", "Tư vấn", "Mẫu thử", "Sản xuất", "QC", "Giao hàng"],
      moqNote: "Liên hệ theo từng sản phẩm",
    },
    priority: "HIGH",
    isVerified: true,
  },
  // ─── WHOLESALE & DEALER ───────────────────────────────────────────────────
  {
    title: "Chính sách đại lý ATTD",
    summary:
      "Chính sách hợp tác đại lý ATTD: điều kiện trở thành đại lý, quyền lợi, chiết khấu, hỗ trợ.",
    content:
      "ATTD.vn hỗ trợ mạng lưới đại lý trên toàn quốc. Chính sách đại lý bao gồm:\n\nĐiều kiện:\n- Cam kết doanh số tối thiểu hàng tháng (liên hệ ATTD để biết mức cụ thể)\n- Đặt hàng lần đầu theo MOQ của từng nhóm sản phẩm\n\nQuyền lợi đại lý:\n- Giá sỉ theo tier doanh số (càng mua nhiều giá càng tốt)\n- Hỗ trợ hình ảnh sản phẩm, catalogue\n- Tư vấn kỹ thuật in/thêu, tư vấn chọn hàng\n- Ưu tiên mẫu mới và thông báo tồn kho\n- Hỗ trợ giao hàng nhanh cho đơn hàng khẩn\n\nQuy trình đăng ký đại lý:\n1. Liên hệ ATTD qua Zalo/website\n2. Tư vấn nhu cầu và xác nhận điều kiện\n3. Ký kết hợp đồng hợp tác\n4. Đặt hàng đầu tiên và kích hoạt tài khoản đại lý\n\nLưu ý: Chi tiết chiết khấu và tier cụ thể — liên hệ ATTD để xác nhận.",
    categorySlug: "wholesale-dealer",
    type: "DEALER",
    usageScope: ["BLOG_AI", "SEO_PLANNING", "SALES", "DEALER_PORTAL", "CRM"],
    tags: ["chính sách đại lý", "đại lý sỉ", "quyền lợi đại lý"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      conditions: ["Cam kết doanh số", "MOQ lần đầu"],
      benefits: ["Giá tier", "Hỗ trợ hình ảnh", "Tư vấn kỹ thuật", "Ưu tiên mẫu mới"],
    },
  },
  {
    title: "Bảng giá sỉ áo thun trơn và polo theo tier",
    summary:
      "Giá sỉ ATTD chia theo tier số lượng: càng mua nhiều giá càng cạnh tranh. Liên hệ nhận bảng giá.",
    content:
      "ATTD.vn áp dụng chính sách bảng giá sỉ theo tier số lượng (volume pricing):\n\nNguyên tắc:\n- Giá sỉ được chia theo mốc số lượng: từ vài chục đến vài trăm và vài nghìn cái\n- Nhóm sản phẩm khác nhau có bảng giá riêng (áo thun trơn, polo, áo khoác, nón, phụ kiện)\n- Giá chưa bao gồm chi phí in/thêu logo\n- Chất liệu và độ dày ảnh hưởng đến giá\n\nCác yếu tố ảnh hưởng giá:\n- Chất liệu (cotton 100% > CVC > TC)\n- Trọng lượng vải (gram/m²)\n- Độ phức tạp form\n- Số lượng màu/size trong đơn\n\nĐể nhận bảng giá sỉ chi tiết: Liên hệ ATTD qua Zalo hoặc form báo giá trên website.\n\nLưu ý: Không công bố giá tối đa/tối thiểu cụ thể trong nội dung mà không được xác nhận từ bộ phận kinh doanh ATTD.",
    categorySlug: "wholesale-dealer",
    type: "PRICING",
    usageScope: ["BLOG_AI", "SEO_PLANNING", "SALES", "CRM"],
    tags: ["bảng giá sỉ", "giá áo thun sỉ", "volume pricing", "tier pricing"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      pricingModel: "Volume tier",
      factors: ["Chất liệu", "Trọng lượng vải", "Số lượng", "Màu/size"],
      note: "Liên hệ ATTD để nhận bảng giá chính xác",
    },
  },
  {
    title: "MOQ tối thiểu theo nhóm sản phẩm tại ATTD",
    summary:
      "MOQ (Minimum Order Quantity) ATTD khác nhau theo nhóm sản phẩm. Liên hệ xác nhận chính xác.",
    content:
      "MOQ (Số lượng đặt tối thiểu) tại ATTD.vn:\n\nNguyên tắc chung:\n- MOQ phụ thuộc vào nhóm sản phẩm, chất liệu và phương thức sản xuất\n- Hàng có sẵn tồn kho: MOQ thấp hơn (thường từ vài chục cái trở lên)\n- Hàng OEM/may riêng: MOQ cao hơn tùy yêu cầu kỹ thuật\n\nHướng dẫn MOQ tham khảo (cần xác minh với team ATTD trước khi publish):\n- Áo thun trơn blank (có sẵn): Từ vài chục cái/màu\n- Áo polo (có sẵn): Từ vài chục cái\n- OEM/may riêng form: Số lượng lớn hơn theo brief\n- Nón, phụ kiện: Tùy loại — liên hệ ATTD\n- Gift set/combo: Liên hệ ATTD theo brief\n\nChính sách mẫu thử: ATTD có thể hỗ trợ mẫu thử trước khi đặt đại trà (có thể phát sinh phí mẫu — xác nhận với ATTD).",
    categorySlug: "wholesale-dealer",
    type: "POLICY",
    usageScope: ["BLOG_AI", "SEO_PLANNING", "SALES", "CRM"],
    tags: ["MOQ", "số lượng tối thiểu", "đặt hàng sỉ"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      moqGuidance: "Phụ thuộc nhóm sản phẩm và phương thức sản xuất",
      note: "Liên hệ ATTD để xác nhận MOQ chính xác trước khi publish số liệu",
    },
  },
  // ─── POLICIES & PROCESSES ────────────────────────────────────────────────
  {
    title: "Quy trình đặt hàng sỉ B2B tại ATTD",
    summary:
      "Quy trình 5 bước đặt hàng sỉ B2B tại ATTD: từ liên hệ tư vấn đến giao hàng toàn quốc.",
    content:
      "Quy trình đặt hàng sỉ B2B tại ATTD.vn:\n\nBước 1 — Liên hệ & Tư vấn\n- Liên hệ qua Zalo, website hoặc form báo giá\n- Cung cấp nhu cầu: sản phẩm, số lượng, màu sắc, tiến độ\n- ATTD tư vấn phương án sản phẩm phù hợp\n\nBước 2 — Báo giá\n- ATTD gửi báo giá chi tiết theo số lượng và yêu cầu\n- Bao gồm: đơn giá, chi phí in/thêu (nếu có), phí vận chuyển\n\nBước 3 — Xác nhận đơn hàng\n- Xác nhận qua email hoặc Zalo\n- Đặt cọc theo thoả thuận\n\nBước 4 — Sản xuất / Lấy hàng\n- Hàng có sẵn: Đóng gói và giao trong vài ngày làm việc\n- Hàng OEM/sản xuất: Theo lead time đã thỏa thuận\n\nBước 5 — Giao hàng\n- Giao toàn quốc qua đối tác vận chuyển\n- Hỗ trợ theo dõi đơn hàng",
    categorySlug: "policies-processes",
    type: "POLICY",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "SALES", "CRM"],
    tags: ["quy trình đặt hàng", "đặt hàng sỉ", "B2B ordering"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      steps: ["Liên hệ tư vấn", "Báo giá", "Xác nhận đơn", "Sản xuất/Lấy hàng", "Giao hàng"],
    },
  },
  {
    title: "Quy trình báo giá B2B tại ATTD",
    summary:
      "Quy trình báo giá B2B nhanh tại ATTD: gửi yêu cầu → nhận báo giá trong 24h làm việc.",
    content:
      "Quy trình báo giá B2B tại ATTD.vn:\n\nThông tin cần cung cấp khi yêu cầu báo giá:\n- Loại sản phẩm (áo thun, polo, nón, tote bag, gift set...)\n- Số lượng ước tính\n- Chất liệu yêu cầu (nếu có)\n- Màu sắc / size cần\n- Phương án in/thêu (nếu có: in logo, thêu, in full màu...)\n- Tiến độ cần hàng\n- Ngân sách tham khảo (nếu có)\n\nCách gửi yêu cầu báo giá:\n- Form báo giá trên attd.vn\n- Chat Zalo trực tiếp\n- Email\n\nThời gian phản hồi: ATTD cam kết phản hồi báo giá trong vòng 24h làm việc.\n\nBáo giá từ ATTD bao gồm: đơn giá, điều kiện MOQ, lead time, chi phí vận chuyển tham khảo.",
    categorySlug: "policies-processes",
    type: "POLICY",
    usageScope: ["BLOG_AI", "SALES", "CRM"],
    tags: ["báo giá B2B", "quy trình báo giá", "yêu cầu báo giá"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      requiredInfo: ["Sản phẩm", "Số lượng", "Chất liệu", "Màu/size", "In/thêu", "Tiến độ"],
      responseTime: "24h làm việc",
    },
  },
  {
    title: "Quy trình giao hàng toàn quốc tại ATTD",
    summary:
      "ATTD giao hàng sỉ toàn quốc: TP.HCM, Hà Nội và các tỉnh thành — theo dõi đơn hàng đầy đủ.",
    content:
      "ATTD.vn hỗ trợ giao hàng sỉ toàn quốc:\n\nKhu vực giao hàng:\n- TP. Hồ Chí Minh và vùng lân cận: Nhanh hơn, có thể giao trong ngày với đơn hàng khẩn\n- Hà Nội và miền Bắc: 1–3 ngày làm việc\n- Các tỉnh thành còn lại: 2–5 ngày làm việc tùy khu vực\n\nĐối tác vận chuyển: GHTK, GHN, J&T Express và các đối tác khác tùy khu vực và khối lượng.\n\nĐơn hàng lớn / đặc biệt:\n- Có thể thỏa thuận vận chuyển riêng hoặc theo đơn vị logistics khách hàng\n- Hỗ trợ đóng gói theo yêu cầu\n\nPhí vận chuyển: Tính theo khối lượng và khu vực — thông báo rõ trong báo giá.\n\nTheo dõi đơn hàng: ATTD cung cấp mã vận đơn để khách hàng tự theo dõi.",
    categorySlug: "policies-processes",
    type: "LOGISTICS",
    usageScope: ["BLOG_AI", "SALES", "CRM"],
    tags: ["giao hàng toàn quốc", "logistics sỉ", "vận chuyển B2B"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      partners: ["GHTK", "GHN", "J&T"],
      deliveryTime: "1–5 ngày tùy khu vực",
    },
  },
  {
    title: "Chính sách mẫu hàng và sản phẩm thử",
    summary:
      "ATTD hỗ trợ xem mẫu thử trước khi đặt hàng đại trà — phí mẫu và quy trình xác nhận.",
    content:
      "Chính sách mẫu hàng và sản phẩm thử tại ATTD:\n\nMục đích:\n- Khách hàng kiểm tra chất lượng thực tế trước khi cam kết đơn lớn\n- Agency kiểm duyệt mẫu để trình khách hàng doanh nghiệp\n\nQuy trình xem mẫu:\n1. Liên hệ ATTD, nêu rõ sản phẩm và yêu cầu mẫu\n2. ATTD tư vấn mẫu sẵn có hoặc sản xuất mẫu mới\n3. Xác nhận phí mẫu (nếu có) và địa chỉ nhận\n4. ATTD gửi mẫu\n5. Khách phản hồi và xác nhận đặt hàng đại trà\n\nLưu ý về phí mẫu:\n- Mẫu có sẵn: Thường tính theo giá sỉ hoặc có hỗ trợ một phần\n- Mẫu OEM/may riêng: Phát sinh phí sản xuất mẫu — xác nhận với ATTD\n\nMẫu thường được tính vào đơn hàng đại trà nếu đặt hàng tiếp theo.",
    categorySlug: "policies-processes",
    type: "POLICY",
    usageScope: ["BLOG_AI", "SALES", "CRM"],
    tags: ["mẫu hàng", "sản phẩm mẫu", "sample policy"],
    priority: "MEDIUM",
    isVerified: true,
    structuredData: {
      sampleProcess: ["Liên hệ", "Tư vấn mẫu", "Xác nhận phí", "Gửi mẫu", "Phản hồi và đặt hàng"],
    },
  },
  // ─── BRAND SEO ───────────────────────────────────────────────────────────
  {
    title: "Brand voice ATTD",
    summary:
      "Giọng thương hiệu ATTD: chuyên nghiệp, minh bạch, B2B-first — không hype, không phóng đại.",
    content:
      "Giọng thương hiệu ATTD.vn:\n\n- Chuyên nghiệp và rõ ràng: Tập trung vào giá trị thực tế cho đối tác B2B\n- Minh bạch: Không phóng đại tính năng, không đưa số liệu chưa xác minh\n- B2B-first: Ngôn ngữ hướng đến đại lý, xưởng in, doanh nghiệp — không retail\n- Tránh: hype rẻ tiền, quảng cáo mạng xã hội kiểu 'chất nhất', fake social proof\n- Phong cách tham chiếu: Hiện đại, premium B2B — tập trung năng lực thực tế\n- Tông bài viết blog: Thông tin hữu ích, tư vấn thực chất cho người mua B2B\n- CTA: Hướng tới liên hệ tư vấn, nhận báo giá, xem mẫu — không oversell",
    categorySlug: "brand-seo",
    type: "BRAND_VOICE",
    usageScope: ["BLOG_AI", "LANDING_PAGE_AI", "PRODUCT_AI"],
    tags: ["brand voice", "tone", "B2B writing style"],
    priority: "HIGH",
    isVerified: true,
  },
  {
    title: "SEO clusters B2B kho sỉ đồng phục và quà tặng doanh nghiệp",
    summary:
      "Cụm SEO ưu tiên ATTD.vn: kho sỉ đồng phục, nguồn hàng áo blank, OEM, quà tặng doanh nghiệp.",
    content:
      "Các cụm SEO ưu tiên của ATTD.vn (B2B wholesale wholesale positioning):\n\nCluster 1: Kho sỉ đồng phục\n- Pillar: 'Kho sỉ đồng phục uy tín tại Việt Nam'\n- Supporting: áo thun trơn sỉ, áo polo sỉ, áo khoác đồng phục sỉ, nón đồng phục sỉ\n\nCluster 2: Nguồn hàng áo blank cho xưởng in\n- Pillar: 'Nguồn hàng áo thun trơn cho xưởng in'\n- Supporting: áo cotton blank sỉ, áo CVC, áo TC, size curve chuẩn\n\nCluster 3: OEM & Private Label\n- Pillar: 'Dịch vụ OEM may mặc theo yêu cầu doanh nghiệp'\n- Supporting: quy trình OEM, MOQ, lead time, chọn chất liệu\n\nCluster 4: Quà tặng doanh nghiệp sỉ\n- Pillar: 'Nguồn hàng quà tặng doanh nghiệp sỉ'\n- Supporting: tote bag sỉ, bình giữ nhiệt sỉ, nón sỉ, gift set combo\n\nCluster 5: Đại lý & Reseller\n- Pillar: 'Trở thành đại lý sỉ đồng phục ATTD'\n- Supporting: chính sách đại lý, bảng giá tier, quy trình đăng ký đại lý",
    categorySlug: "brand-seo",
    type: "SEO_CONTEXT",
    usageScope: ["BLOG_AI", "SEO_PLANNING"],
    tags: ["SEO cluster", "kho sỉ đồng phục", "B2B wholesale SEO"],
    priority: "HIGH",
    isVerified: true,
    structuredData: {
      clusters: [
        "Kho sỉ đồng phục",
        "Nguồn hàng áo blank xưởng in",
        "OEM & Private Label",
        "Quà tặng doanh nghiệp sỉ",
        "Đại lý & Reseller",
      ],
    },
  },
];

export async function importKnowledgeBaseStarterData(): Promise<{
  created: number;
  skipped: number;
  total: number;
}> {
  await ensureDefaultKnowledgeCategories();

  let created = 0;
  let skipped = 0;

  for (const item of STARTER_ENTRIES) {
    const categoryId = await getCategoryIdBySlug(item.categorySlug);
    if (!categoryId) continue;

    const slug = generateKnowledgeBaseSlug(item.title);
    const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { slug } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await createKnowledgeBaseEntry({
      title: item.title,
      slug,
      summary: item.summary,
      content: item.content,
      categoryId,
      type: item.type,
      status: "ACTIVE",
      priority: item.priority ?? "MEDIUM",
      tags: item.tags,
      usageScope: item.usageScope,
      structuredData: (item.structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
      isVerified: item.isVerified ?? false,
      isFeatured: item.priority === "HIGH",
    });
    created += 1;
  }

  return { created, skipped, total: STARTER_ENTRIES.length };
}
