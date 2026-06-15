/**
 * Knowledge Base import templates.
 * Column names must match KB_IMPORT_FIELDS keys used by the KB import parser.
 */
export type ImportTemplateDefinition = {
  id: string;
  label: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  requiredFields?: string[];
};

export const IMPORT_TEMPLATES: ImportTemplateDefinition[] = [
  // ── 1. FAQ ────────────────────────────────────────────────────────────────
  {
    id: "faq",
    label: "Mẫu FAQ",
    requiredFields: ["title", "content"],
    headers: [
      "title", "content", "category", "type", "status", "priority",
      "tags", "usageScope", "isVerified", "source", "sourceUrl", "structuredData",
    ],
    sampleRows: [
      {
        title: "Chính sách đại lý ATTD là gì?",
        content: "ATTD hỗ trợ đại lý toàn quốc với nguồn hàng ổn định, giá sỉ cạnh tranh và chính sách thanh toán linh hoạt. Đại lý được hưởng chiết khấu theo bậc số lượng và hỗ trợ marketing.",
        category: "FAQ & tư vấn",
        type: "FAQ",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "đại lý, chính sách, bán sỉ",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal",
        sourceUrl: "https://attd.vn/chinh-sach-dai-ly",
        structuredData: "",
      },
      {
        title: "ATTD có hỗ trợ agency quà tặng doanh nghiệp không?",
        content: "Có — ATTD là đối tác cung cấp hàng sỉ cho agency quảng cáo và tổ chức sự kiện. Hỗ trợ báo giá nhanh, giao hàng đúng deadline, in/thêu logo theo yêu cầu.",
        category: "FAQ & tư vấn",
        type: "FAQ",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "agency, quà tặng, B2B, đồng phục",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal",
        sourceUrl: "",
        structuredData: "",
      },
      {
        title: "MOQ tối thiểu khi lấy hàng sỉ tại ATTD là bao nhiêu?",
        content: "MOQ phụ thuộc từng sản phẩm. Áo thun trơn: 50 cái/màu. Áo polo: 50 cái. Tote bag: 100 cái. Bình giữ nhiệt: 50 cái. Gift set: 50 set. Liên hệ để xác nhận MOQ theo sản phẩm cụ thể.",
        category: "FAQ & tư vấn",
        type: "FAQ",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "MOQ, số lượng tối thiểu, sỉ",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal",
        sourceUrl: "",
        structuredData: "{\"moq\":\"Tùy sản phẩm — xem chi tiết\"}",
      },
    ],
  },

  // ── 2. Product Knowledge ──────────────────────────────────────────────────
  {
    id: "product-knowledge",
    label: "Mẫu kiến thức sản phẩm",
    requiredFields: ["title", "content"],
    headers: [
      "title", "content", "category", "type", "status", "priority",
      "tags", "usageScope", "isVerified", "source", "sourceUrl",
      "structuredData.materials", "structuredData.moq",
    ],
    sampleRows: [
      {
        title: "Nguồn hàng áo thun trơn sỉ — CVC và Cotton 100%",
        content: "ATTD cung cấp áo thun trơn sỉ CVC 65/35 và Cotton 100% cho đại lý, xưởng in và reseller. Các màu cơ bản (đen, trắng, xám, navy) luôn có sẵn kho. MOQ từ 50 cái/màu.",
        category: "Sản phẩm & chất liệu",
        type: "PRODUCT",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "áo thun trơn, CVC, cotton, sỉ, nguồn hàng",
        usageScope: "SEO_PLANNING",
        isVerified: "true",
        source: "ATTD Catalog",
        sourceUrl: "https://attd.vn/kho-ao-thun-tron",
        "structuredData.materials": "CVC 65/35, Cotton 100%",
        "structuredData.moq": "50 cái/màu",
      },
      {
        title: "Nguồn hàng áo polo trơn sỉ — cá sấu poly và cotton pique",
        content: "ATTD cung cấp áo polo cá sấu poly và cotton pique cho đại lý, xưởng in. Form regular fit, cổ bo 3 lá, phù hợp in và thêu logo. Màu phổ biến: trắng, đen, navy. Sỉ từ 50 cái.",
        category: "Sản phẩm & chất liệu",
        type: "PRODUCT",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "áo polo, pique, cá sấu, sỉ, nguồn hàng",
        usageScope: "SEO_PLANNING",
        isVerified: "true",
        source: "ATTD Catalog",
        sourceUrl: "",
        "structuredData.materials": "Polyester pique, Cotton pique",
        "structuredData.moq": "50 cái",
      },
      {
        title: "Tote bag canvas sỉ — nguồn hàng ATTD",
        content: "ATTD cung cấp tote bag canvas 280gsm cho doanh nghiệp. Kích thước 35x40cm và 40x35cm. Phù hợp in lụa/nhiệt logo. Màu natural/be, đen, navy. Sỉ từ 100 cái.",
        category: "Quà tặng doanh nghiệp",
        type: "PRODUCT",
        status: "PUBLISHED",
        priority: "MEDIUM",
        tags: "tote bag, canvas, quà tặng, sỉ, B2B",
        usageScope: "SEO_PLANNING",
        isVerified: "true",
        source: "ATTD Catalog",
        sourceUrl: "",
        "structuredData.materials": "Canvas 280gsm",
        "structuredData.moq": "100 cái",
      },
      {
        title: "Bình giữ nhiệt inox sỉ — 350ml, 500ml, 600ml",
        content: "Bình giữ nhiệt inox 304 cao cấp. Dung tích 350ml, 500ml và 600ml. Giữ nhiệt 12h, giữ lạnh 24h. Phù hợp khắc laser logo. Sỉ từ 50 cái.",
        category: "Quà tặng doanh nghiệp",
        type: "PRODUCT",
        status: "PUBLISHED",
        priority: "MEDIUM",
        tags: "bình giữ nhiệt, inox, quà tặng, sỉ",
        usageScope: "SEO_PLANNING",
        isVerified: "true",
        source: "ATTD Catalog",
        sourceUrl: "",
        "structuredData.materials": "Inox 304",
        "structuredData.moq": "50 cái",
      },
    ],
  },

  // ── 3. SOP / Process ─────────────────────────────────────────────────────
  {
    id: "sop",
    label: "Mẫu quy trình/SOP",
    requiredFields: ["title", "content"],
    headers: [
      "title", "content", "category", "type", "status", "priority",
      "tags", "usageScope", "isVerified", "source",
    ],
    sampleRows: [
      {
        title: "Quy trình báo giá B2B tại ATTD",
        content: "1. Khách gửi yêu cầu sản phẩm và số lượng. 2. Sale xác nhận chất liệu, màu sắc và in ấn. 3. ATTD gửi báo giá trong 2–4h làm việc. 4. Khách xác nhận và đặt cọc 30%. 5. Sản xuất và giao hàng theo thỏa thuận.",
        category: "Chính sách & quy trình",
        type: "POLICY",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "quy trình, báo giá, B2B, sales",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal SOP",
      },
      {
        title: "Quy trình đặt hàng sỉ tại ATTD",
        content: "1. Chọn sản phẩm và số lượng từ catalog. 2. Liên hệ sale qua Zalo/hotline. 3. Nhận báo giá chính thức. 4. Đặt cọc và xác nhận đơn. 5. Giao hàng toàn quốc 2–5 ngày làm việc.",
        category: "Chính sách & quy trình",
        type: "POLICY",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "quy trình, đặt hàng, sỉ, vận chuyển",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal SOP",
      },
      {
        title: "Quy trình giao hàng toàn quốc ATTD",
        content: "ATTD giao hàng toàn quốc qua các đối tác vận chuyển: GHTK, GHN, Viettel Post. Thời gian giao hàng: TP.HCM 1–2 ngày, tỉnh thành khác 2–5 ngày. Đơn lớn có thể đàm phán cước ship.",
        category: "Chính sách & quy trình",
        type: "POLICY",
        status: "PUBLISHED",
        priority: "MEDIUM",
        tags: "giao hàng, vận chuyển, toàn quốc",
        usageScope: "SALES",
        isVerified: "true",
        source: "ATTD Internal SOP",
      },
      {
        title: "Quy trình xử lý yêu cầu sản xuất mẫu OEM",
        content: "1. Khách gửi mô tả mẫu (vải, màu, size, thiết kế). 2. ATTD tư vấn và xác nhận khả thi. 3. Sản xuất mẫu trong 3–5 ngày. 4. Khách duyệt mẫu hoặc yêu cầu điều chỉnh. 5. Xác nhận sản xuất số lượng lớn.",
        category: "Sản xuất & OEM",
        type: "OEM",
        status: "PUBLISHED",
        priority: "MEDIUM",
        tags: "OEM, mẫu, sản xuất, quy trình",
        usageScope: "INTERNAL",
        isVerified: "true",
        source: "ATTD Internal SOP",
      },
    ],
  },

  // ── 4. ATTD B2B Knowledge ─────────────────────────────────────────────────
  {
    id: "b2b-knowledge",
    label: "Mẫu Knowledge ATTD B2B",
    requiredFields: ["title", "content"],
    headers: [
      "title", "content", "category", "type", "status", "priority",
      "tags", "usageScope", "isVerified", "source", "sourceUrl",
    ],
    sampleRows: [
      {
        title: "ATTD.vn là kho sỉ đồng phục & quà tặng doanh nghiệp",
        content: "ATTD.vn là nền tảng B2B wholesale chuyên cung cấp đồng phục trơn và quà tặng doanh nghiệp cho đại lý, agency, xưởng in và reseller. ATTD KHÔNG phải dịch vụ in lẻ hay in theo yêu cầu nhỏ lẻ.",
        category: "Định vị thương hiệu",
        type: "BRAND",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "ATTD, B2B, kho sỉ, đồng phục, quà tặng doanh nghiệp",
        usageScope: "SEO_PLANNING",
        isVerified: "true",
        source: "Brand Guideline",
        sourceUrl: "https://attd.vn",
      },
      {
        title: "ATTD phục vụ đại lý, agency, xưởng in và doanh nghiệp mua số lượng lớn",
        content: "Đối tượng khách hàng của ATTD: (1) Đại lý bán lẻ và phân phối đồng phục; (2) Agency quảng cáo tổ chức sự kiện; (3) Xưởng in nhận đặt áo trơn nguyên liệu; (4) Doanh nghiệp mua đồng phục/quà tặng số lượng lớn; (5) Reseller online và offline.",
        category: "Định vị thương hiệu",
        type: "BRAND",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "khách hàng B2B, đại lý, agency, xưởng in",
        usageScope: "SALES",
        isVerified: "true",
        source: "Brand Guideline",
        sourceUrl: "",
      },
      {
        title: "AOTHUNTHONGDIEP.com là dịch vụ in áo theo yêu cầu — khác ATTD.vn",
        content: "AOTHUNTHONGDIEP.com là thương hiệu in áo lẻ, in theo yêu cầu tùy chỉnh số lượng ít. ATTD.vn là kho sỉ — hai thương hiệu khác nhau, phục vụ phân khúc khách hàng khác nhau.",
        category: "Định vị thương hiệu",
        type: "BRAND",
        status: "PUBLISHED",
        priority: "MEDIUM",
        tags: "ATTD, AOTHUNTHONGDIEP, phân biệt, B2B vs B2C",
        usageScope: "SALES",
        isVerified: "true",
        source: "Brand Guideline",
        sourceUrl: "https://aothunthongdiep.com",
      },
      {
        title: "Lợi thế cạnh tranh của ATTD trong thị trường B2B đồng phục",
        content: "ATTD cạnh tranh dựa trên: (1) Kho hàng sẵn lớn — giao nhanh; (2) Giá sỉ cạnh tranh theo bậc số lượng; (3) Chất lượng vải ổn định từ nhà máy uy tín; (4) Hỗ trợ OEM và private label; (5) Sale B2B chuyên nghiệp — báo giá nhanh.",
        category: "Bán sỉ & đại lý",
        type: "DEALER",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "lợi thế, cạnh tranh, B2B, kho sỉ",
        usageScope: "SALES",
        isVerified: "true",
        source: "Brand Guideline",
        sourceUrl: "",
      },
    ],
  },

  // ── Legacy templates (kept for backward compatibility) ───────────────────
  {
    id: "product",
    label: "Sản phẩm (cũ)",
    requiredFields: ["title", "content"],
    headers: ["title", "content", "category", "type", "status", "priority", "tags"],
    sampleRows: [
      {
        title: "Áo thun trơn — nhóm sản phẩm sỉ",
        content: "Áo thun trơn CVC/cotton cho đại lý và xưởng in. Sỉ từ 50 cái/màu.",
        category: "Sản phẩm & chất liệu",
        type: "PRODUCT",
        status: "PUBLISHED",
        priority: "HIGH",
        tags: "áo thun, sỉ, nguồn hàng",
      },
    ],
  },
  {
    id: "oem",
    label: "OEM (cũ)",
    requiredFields: ["title", "content"],
    headers: ["title", "content", "category", "type", "status", "tags"],
    sampleRows: [
      {
        title: "Dịch vụ OEM áo thun theo yêu cầu",
        content: "ATTD nhận OEM áo thun từ 100 cái — full-service may, in, thêu, đóng gói.",
        category: "Sản xuất & OEM",
        type: "OEM",
        status: "DRAFT",
        tags: "OEM, sản xuất, private label",
      },
    ],
  },
  {
    id: "dealer",
    label: "Đại lý (cũ)",
    requiredFields: ["title", "content"],
    headers: ["title", "content", "category", "type", "status", "tags"],
    sampleRows: [
      {
        title: "Chính sách đại lý áo thun trơn ATTD",
        content: "Chiết khấu theo bậc: 50 cái/màu giá sỉ, 200+ cái giá cạnh tranh hơn. Hỗ trợ marketing.",
        category: "Bán sỉ & đại lý",
        type: "DEALER",
        status: "DRAFT",
        tags: "đại lý, bán sỉ, chính sách",
      },
    ],
  },
  {
    id: "policy",
    label: "Chính sách (cũ)",
    requiredFields: ["title", "content"],
    headers: ["title", "content", "category", "type", "status", "tags"],
    sampleRows: [
      {
        title: "Chính sách giao hàng toàn quốc",
        content: "Giao qua GHTK/GHN. TP.HCM 1–2 ngày. Tỉnh thành 2–5 ngày.",
        category: "Chính sách & quy trình",
        type: "POLICY",
        status: "DRAFT",
        tags: "chính sách, giao hàng",
      },
    ],
  },
];

export function getImportTemplate(id: string): ImportTemplateDefinition | undefined {
  return IMPORT_TEMPLATES.find((t) => t.id === id);
}

/** Templates shown in the download UI — primary 4 only */
export const PRIMARY_IMPORT_TEMPLATES = IMPORT_TEMPLATES.slice(0, 4);
