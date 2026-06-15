import type { ImportMappingPreset } from "@/features/knowledge-base/knowledge-base-import-types";

export const IMPORT_MAPPING_PRESETS: ImportMappingPreset[] = [
  {
    id: "product-catalog",
    label: "Product Catalog Preset",
    description: "Danh mục sản phẩm — tên, mô tả, chất liệu, MOQ, tags",
    mapping: {
      "Product Name": "title",
      "Tên sản phẩm": "title",
      Description: "content",
      "Mô tả": "content",
      Summary: "summary",
      Material: "structuredData.material",
      "Chất liệu": "structuredData.material",
      MOQ: "structuredData.moq",
      Form: "structuredData.form",
      Colors: "structuredData.colors",
      Sizes: "structuredData.sizes",
      Tags: "tags",
      Category: "category",
      Type: "type",
      Status: "status",
      Priority: "priority",
    },
  },
  {
    id: "oem",
    label: "OEM Preset",
    description: "Năng lực OEM — MOQ, lead time, dịch vụ",
    mapping: {
      Title: "title",
      "Tiêu đề": "title",
      Content: "content",
      "Nội dung": "content",
      MOQ: "structuredData.moq",
      "Lead Time": "structuredData.leadTime",
      "Lead time": "structuredData.leadTime",
      Services: "structuredData.services",
      "Dịch vụ": "structuredData.services",
      Tags: "tags",
      Category: "category",
      Type: "type",
    },
  },
  {
    id: "faq",
    label: "FAQ Preset",
    description: "Danh sách câu hỏi thường gặp",
    mapping: {
      Question: "structuredData.questions",
      "Câu hỏi": "structuredData.questions",
      Answer: "structuredData.answers",
      "Câu trả lời": "structuredData.answers",
      Title: "title",
      "Tiêu đề": "title",
      Content: "content",
      Tags: "tags",
      Category: "category",
    },
  },
  {
    id: "policy",
    label: "Policy Preset",
    description: "Chính sách — điều kiện, đối tượng",
    mapping: {
      "Policy Name": "structuredData.policyName",
      "Chính sách": "title",
      Title: "title",
      Content: "content",
      "Nội dung": "content",
      Conditions: "structuredData.conditions",
      "Điều kiện": "structuredData.conditions",
      Audience: "structuredData.targetAudience",
      "Đối tượng": "structuredData.targetAudience",
      Tags: "tags",
      Category: "category",
    },
  },
  {
    id: "dealer",
    label: "Dealer Preset",
    description: "Chính sách đại lý và hợp tác",
    mapping: {
      Title: "title",
      Content: "content",
      Audience: "structuredData.targetAudience",
      "Chính sách giá": "structuredData.pricingPolicy",
      "Pricing Policy": "structuredData.pricingPolicy",
      Tags: "tags",
      Category: "category",
      Type: "type",
    },
  },
];

export function applyMappingPreset(
  headers: string[],
  presetId: string
): Record<string, string> {
  const preset = IMPORT_MAPPING_PRESETS.find((p) => p.id === presetId);
  if (!preset) return {};

  const result: Record<string, string> = {};
  for (const header of headers) {
    const trimmed = header.trim();
    const kbField = preset.mapping[trimmed] ?? preset.mapping[header];
    if (kbField) {
      result[header] = kbField;
    }
  }
  return result;
}

export function guessColumnMapping(headers: string[]): Record<string, string> {
  const normalized = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "");

  const rules: Array<{ patterns: string[]; field: string }> = [
    { patterns: ["productname", "tensanpham", "title", "tieude", "name"], field: "title" },
    { patterns: ["slug"], field: "slug" },
    { patterns: ["summary", "tomtat"], field: "summary" },
    { patterns: ["description", "content", "noidung", "mota"], field: "content" },
    { patterns: ["type", "loai"], field: "type" },
    { patterns: ["category", "danhmuc"], field: "category" },
    { patterns: ["status", "trangthai"], field: "status" },
    { patterns: ["priority", "uutien"], field: "priority" },
    { patterns: ["tags", "tag"], field: "tags" },
    { patterns: ["usagescope", "mucdich"], field: "usageScope" },
    { patterns: ["verified", "kiemchung"], field: "isVerified" },
    { patterns: ["moq"], field: "structuredData.moq" },
    { patterns: ["leadtime", "thoigiansanxuat"], field: "structuredData.leadTime" },
    { patterns: ["material", "chatlieu"], field: "structuredData.material" },
    { patterns: ["form", "formdang"], field: "structuredData.form" },
    { patterns: ["colors", "mausac"], field: "structuredData.colors" },
    { patterns: ["sizes", "kichthuoc"], field: "structuredData.sizes" },
    { patterns: ["question", "cauhoi"], field: "structuredData.questions" },
    { patterns: ["answer", "cautraloi"], field: "structuredData.answers" },
  ];

  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const key = normalized(header);
    for (const rule of rules) {
      if (rule.patterns.some((p) => key.includes(p) || p.includes(key))) {
        mapping[header] = rule.field;
        break;
      }
    }
  }
  return mapping;
}
