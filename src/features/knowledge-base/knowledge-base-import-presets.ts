import type { ImportMappingPreset } from "@/features/knowledge-base/knowledge-base-import-types";

export const IMPORT_PRESETS: ImportMappingPreset[] = [
  {
    id: "faq",
    label: "FAQ Preset",
    description: "Câu hỏi → tiêu đề, câu trả lời → nội dung",
    mapping: {
      question: "title",
      "Câu hỏi": "title",
      answer: "content",
      "Câu trả lời": "content",
      category: "category",
      "Danh mục": "category",
      tags: "tags",
      Tags: "tags",
    },
    defaults: {
      type: "FAQ",
      status: "ACTIVE",
      usageScope: ["SALES", "CRM", "SEO_PLANNING"],
      isVerified: false,
      priority: "MEDIUM",
    },
  },
  {
    id: "product",
    label: "Product Knowledge Preset",
    description: "Sản phẩm — tên, mô tả, chất liệu, phương pháp in",
    mapping: {
      productName: "title",
      "Product Name": "title",
      "Tên sản phẩm": "title",
      description: "content",
      Description: "content",
      "Mô tả": "content",
      category: "category",
      Category: "category",
      materials: "structuredData.materials",
      Materials: "structuredData.materials",
      "Chất liệu": "structuredData.materials",
      printMethods: "structuredData.printMethods",
      "Print Methods": "structuredData.printMethods",
      tags: "tags",
      Tags: "tags",
    },
    defaults: {
      type: "PRODUCT",
      status: "ACTIVE",
      usageScope: ["SALES", "SEO_PLANNING", "PRODUCT_AI"],
      isVerified: false,
      priority: "MEDIUM",
    },
  },
  {
    id: "process",
    label: "Process / SOP Preset",
    description: "Quy trình nội bộ — tên, các bước, phòng ban",
    mapping: {
      processName: "title",
      "Process Name": "title",
      "Tên quy trình": "title",
      steps: "content",
      Steps: "content",
      "Các bước": "content",
      department: "category",
      Department: "category",
      "Phòng ban": "category",
      owner: "structuredData.owner",
      Owner: "structuredData.owner",
      tags: "tags",
      Tags: "tags",
    },
    defaults: {
      type: "SALES_SCRIPT",
      status: "ACTIVE",
      usageScope: ["INTERNAL_ONLY", "SALES", "CRM"],
      isVerified: false,
      priority: "MEDIUM",
    },
  },
];

export function getImportPreset(id: string): ImportMappingPreset | undefined {
  return IMPORT_PRESETS.find((preset) => preset.id === id);
}

export function applyImportPreset(headers: string[], presetId: string): {
  mapping: Record<string, string>;
  defaults: ImportMappingPreset["defaults"];
} {
  const preset = getImportPreset(presetId);
  if (!preset) return { mapping: {}, defaults: {} };

  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const trimmed = header.trim();
    const kbField =
      preset.mapping[trimmed] ??
      preset.mapping[header] ??
      preset.mapping[trimmed.toLowerCase()];
    if (kbField) mapping[header] = kbField;
  }

  return { mapping, defaults: preset.defaults };
}

export function guessColumnMapping(headers: string[]): Record<string, string> {
  const normalized = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "");

  const rules: Array<{ patterns: string[]; field: string }> = [
    { patterns: ["question", "cauhoi"], field: "title" },
    { patterns: ["answer", "cautraloi"], field: "content" },
    { patterns: ["productname", "tensanpham", "title", "tieude"], field: "title" },
    { patterns: ["processname", "tenquytrinh"], field: "title" },
    { patterns: ["description", "content", "noidung", "mota", "steps"], field: "content" },
    { patterns: ["category", "danhmuc", "department"], field: "category" },
    { patterns: ["type", "loai"], field: "type" },
    { patterns: ["status", "trangthai"], field: "status" },
    { patterns: ["priority", "uutien"], field: "priority" },
    { patterns: ["tags", "tag"], field: "tags" },
    { patterns: ["usagescope", "mucdich"], field: "usageScope" },
    { patterns: ["verified", "kiemchung"], field: "isVerified" },
    { patterns: ["source"], field: "source" },
    { patterns: ["sourceurl", "url"], field: "sourceUrl" },
    { patterns: ["materials", "chatlieu"], field: "structuredData.materials" },
    { patterns: ["printmethods"], field: "structuredData.printMethods" },
    { patterns: ["owner"], field: "structuredData.owner" },
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
