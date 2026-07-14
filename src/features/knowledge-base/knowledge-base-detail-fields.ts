import type { KnowledgeBaseEntryType } from "@prisma/client";

export type DetailFieldType = "text" | "textarea" | "list";

export type DetailFieldDefinition = {
  key: string;
  label: string;
  type: DetailFieldType;
  placeholder?: string;
};

export type DetailFormSchema = "product" | "oem" | "dealer" | "policy" | "faq" | "generic";

const PRODUCT_FIELDS: DetailFieldDefinition[] = [
  { key: "material", label: "Chất liệu", type: "text", placeholder: "Ví dụ: Cotton 100%, CVC" },
  { key: "materialComposition", label: "Thành phần vải", type: "text", placeholder: "60% cotton, 40% polyester" },
  { key: "fabricWeightGsm", label: "Định lượng (GSM)", type: "text", placeholder: "180" },
  { key: "form", label: "Form dáng", type: "text", placeholder: "Ví dụ: Regular fit, slim fit" },
  { key: "colors", label: "Màu sắc", type: "list", placeholder: "Đen, Trắng, Xám" },
  { key: "sizes", label: "Kích thước", type: "list", placeholder: "S, M, L, XL, XXL" },
  { key: "moq", label: "MOQ (mô tả)", type: "text", placeholder: "Ví dụ: 10 sản phẩm" },
  { key: "moqValue", label: "MOQ (số)", type: "text", placeholder: "10" },
  { key: "moqUnit", label: "Đơn vị MOQ", type: "text", placeholder: "sản phẩm / màu" },
  { key: "printCompatibility", label: "Tương thích in", type: "list", placeholder: "Screen print, DTG" },
  { key: "embroideryCompatibility", label: "Tương thích thêu", type: "list", placeholder: "Logo ngực, tay áo" },
  { key: "washCompatibility", label: "Tương thích wash", type: "list", placeholder: "Enzyme wash, stone wash" },
  { key: "useCases", label: "Ứng dụng", type: "list", placeholder: "In logo, đồng phục, bán sỉ" },
  { key: "notes", label: "Ghi chú", type: "textarea" },
];

const OEM_FIELDS: DetailFieldDefinition[] = [
  { key: "moq", label: "MOQ (mô tả)", type: "text" },
  { key: "moqValue", label: "MOQ (số)", type: "text" },
  { key: "leadTime", label: "Lead time (mô tả)", type: "text", placeholder: "Ví dụ: 7–14 ngày" },
  { key: "leadTimeMinDays", label: "Lead time min (ngày)", type: "text", placeholder: "7" },
  { key: "leadTimeMaxDays", label: "Lead time max (ngày)", type: "text", placeholder: "14" },
  { key: "capacity", label: "Công suất", type: "text", placeholder: "10.000 áo/tháng" },
  { key: "factoryLocation", label: "Vị trí xưởng", type: "text" },
  { key: "country", label: "Quốc gia", type: "text", placeholder: "Việt Nam" },
  { key: "services", label: "Dịch vụ hỗ trợ", type: "list", placeholder: "May, In, Thêu, Đóng gói" },
  { key: "manufacturingTech", label: "Công nghệ sản xuất", type: "text" },
  { key: "designRequirements", label: "Yêu cầu thiết kế", type: "textarea" },
  { key: "notes", label: "Ghi chú", type: "textarea" },
];

const DEALER_FIELDS: DetailFieldDefinition[] = [
  { key: "targetAudience", label: "Đối tượng", type: "text", placeholder: "Đại lý, xưởng in, shop online" },
  { key: "pricingPolicy", label: "Chính sách giá", type: "textarea" },
  { key: "partnershipTerms", label: "Điều kiện hợp tác", type: "textarea" },
  { key: "marketingSupport", label: "Hỗ trợ marketing", type: "textarea" },
  { key: "shippingSupport", label: "Hỗ trợ vận chuyển", type: "textarea" },
  { key: "notes", label: "Ghi chú", type: "textarea" },
];

const POLICY_FIELDS: DetailFieldDefinition[] = [
  { key: "policyName", label: "Chính sách áp dụng", type: "text" },
  { key: "targetAudience", label: "Đối tượng", type: "text" },
  { key: "effectivePeriod", label: "Thời gian áp dụng", type: "text" },
  { key: "conditions", label: "Điều kiện", type: "textarea" },
  { key: "notes", label: "Ghi chú", type: "textarea" },
];

const FAQ_FIELDS: DetailFieldDefinition[] = [
  { key: "questions", label: "Danh sách câu hỏi", type: "list", placeholder: "Mỗi dòng một câu hỏi" },
  { key: "answers", label: "Danh sách câu trả lời", type: "list", placeholder: "Mỗi dòng một câu trả lời" },
  { key: "notes", label: "Ghi chú", type: "textarea" },
];

const GENERIC_FIELDS: DetailFieldDefinition[] = [
  { key: "keyPoints", label: "Điểm chính", type: "list" },
  { key: "notes", label: "Ghi chú bổ sung", type: "textarea" },
];

export function getDetailFormSchema(type: KnowledgeBaseEntryType): DetailFormSchema {
  if (type === "PRODUCT" || type === "MATERIAL") return "product";
  if (type === "OEM" || type === "MANUFACTURING") return "oem";
  if (type === "DEALER" || type === "WHOLESALE") return "dealer";
  if (type === "POLICY" || type === "LOGISTICS" || type === "PRICING") return "policy";
  if (type === "FAQ") return "faq";
  return "generic";
}

export function getDetailFieldsForType(type: KnowledgeBaseEntryType): DetailFieldDefinition[] {
  const schema = getDetailFormSchema(type);
  if (schema === "product") return PRODUCT_FIELDS;
  if (schema === "oem") return OEM_FIELDS;
  if (schema === "dealer") return DEALER_FIELDS;
  if (schema === "policy") return POLICY_FIELDS;
  if (schema === "faq") return FAQ_FIELDS;
  return GENERIC_FIELDS;
}

export function listToString(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("\n");
  if (typeof value === "string") return value;
  return "";
}

export function stringToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function structuredDataToFormValues(
  data: Record<string, unknown> | null,
  fields: DetailFieldDefinition[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = data?.[field.key];
    if (field.type === "list") {
      values[field.key] = listToString(raw);
    } else {
      values[field.key] = raw != null ? String(raw) : "";
    }
  }
  return values;
}

export function formValuesToStructuredData(
  values: Record<string, string>,
  fields: DetailFieldDefinition[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.key]?.trim() ?? "";
    if (!raw) continue;
    if (field.type === "list") {
      const list = stringToList(raw);
      if (list.length > 0) result[field.key] = list;
    } else {
      result[field.key] = raw;
    }
  }
  return result;
}
