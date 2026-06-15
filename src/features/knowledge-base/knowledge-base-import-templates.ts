export type ImportTemplateDefinition = {
  id: string;
  label: string;
  headers: string[];
  sampleRows: Record<string, string>[];
};

export const IMPORT_TEMPLATES: ImportTemplateDefinition[] = [
  {
    id: "product",
    label: "Product Template",
    headers: [
      "Product Name",
      "Summary",
      "Description",
      "Material",
      "Form",
      "Colors",
      "Sizes",
      "MOQ",
      "Tags",
      "Category",
      "Type",
      "Status",
      "Priority",
    ],
    sampleRows: [
      {
        "Product Name": "Áo thun trơn — nhóm sản phẩm",
        Summary: "Áo thun trơn chất lượng cao cho đại lý và xưởng in",
        Description: "Sản phẩm chủ lực ATTD — cotton/CVC, form regular fit, phù hợp in logo và đồng phục.",
        Material: "Cotton 100%, CVC",
        Form: "Regular fit",
        Colors: "Đen, Trắng, Xám",
        Sizes: "S, M, L, XL, XXL",
        MOQ: "10 sản phẩm",
        Tags: "sản phẩm, áo thun, bán sỉ",
        Category: "Sản phẩm & chất liệu",
        Type: "PRODUCT",
        Status: "DRAFT",
        Priority: "HIGH",
      },
    ],
  },
  {
    id: "oem",
    label: "OEM Template",
    headers: [
      "Title",
      "Summary",
      "Content",
      "MOQ",
      "Lead Time",
      "Services",
      "Tags",
      "Category",
      "Type",
      "Status",
    ],
    sampleRows: [
      {
        Title: "Dịch vụ OEM áo thun theo yêu cầu",
        Summary: "OEM full-service: may, in, thêu, đóng gói",
        Content: "ATTD hỗ trợ OEM từ thiết kế đến giao hàng — MOQ linh hoạt theo sản phẩm.",
        MOQ: "Tùy sản phẩm",
        "Lead Time": "7–14 ngày",
        Services: "May, In, Thêu, Đóng gói",
        Tags: "OEM, sản xuất, private label",
        Category: "Sản xuất & OEM",
        Type: "OEM",
        Status: "DRAFT",
      },
    ],
  },
  {
    id: "dealer",
    label: "Dealer Template",
    headers: [
      "Title",
      "Summary",
      "Content",
      "Audience",
      "Pricing Policy",
      "Tags",
      "Category",
      "Type",
      "Status",
    ],
    sampleRows: [
      {
        Title: "Chính sách đại lý áo thun trơn",
        Summary: "Cơ hội hợp tác đại lý — nguồn hàng ổn định",
        Content: "Mô tả điều kiện hợp tác, hỗ trợ marketing và vận chuyển cho đại lý.",
        Audience: "Đại lý, xưởng in, shop online",
        "Pricing Policy": "Giá sỉ theo bậc số lượng",
        Tags: "đại lý, bán sỉ, nguồn hàng",
        Category: "Bán sỉ & đại lý",
        Type: "DEALER",
        Status: "DRAFT",
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ Template",
    headers: ["Title", "Question", "Answer", "Content", "Tags", "Category", "Type", "Status"],
    sampleRows: [
      {
        Title: "FAQ về nguồn hàng áo thun trơn",
        Question: "MOQ là bao nhiêu?",
        Answer: "Tùy sản phẩm — liên hệ để xác nhận.",
        Content: "Nhóm FAQ tư vấn nguồn hàng cho đại lý và xưởng in.",
        Tags: "FAQ, tư vấn",
        Category: "FAQ & tư vấn",
        Type: "FAQ",
        Status: "DRAFT",
      },
    ],
  },
  {
    id: "policy",
    label: "Policy Template",
    headers: [
      "Policy Name",
      "Summary",
      "Content",
      "Audience",
      "Conditions",
      "Tags",
      "Category",
      "Type",
      "Status",
    ],
    sampleRows: [
      {
        "Policy Name": "Chính sách giao hàng toàn quốc",
        Summary: "Giao hàng nhanh trên toàn quốc",
        Content: "Mô tả thời gian giao hàng, phí ship và điều kiện áp dụng.",
        Audience: "Khách B2B, đại lý, doanh nghiệp",
        Conditions: "Đơn tối thiểu theo khu vực",
        Tags: "chính sách, giao hàng",
        Category: "Chính sách & quy trình",
        Type: "POLICY",
        Status: "DRAFT",
      },
    ],
  },
];

export function getImportTemplate(id: string): ImportTemplateDefinition | undefined {
  return IMPORT_TEMPLATES.find((t) => t.id === id);
}
