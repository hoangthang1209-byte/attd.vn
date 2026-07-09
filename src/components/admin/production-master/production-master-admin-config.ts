import {
  PRINT_METHOD_CATEGORY_LABELS,
  PRINT_METHOD_CATEGORIES,
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_TRIM_CATEGORY_LABELS,
  PRODUCTION_TRIM_CATEGORIES,
  SUPPLIER_CATEGORIES,
  SUPPLIER_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";

export type MasterEntityKind = "material" | "trim" | "supplier" | "print-method";

export type MasterListColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => string;
};

export type MasterFieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "supplier-select";
  options?: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
};

export type MasterAdminConfig = {
  kind: MasterEntityKind;
  title: string;
  listPath: string;
  apiPath: string;
  createLabel: string;
  columns: MasterListColumn[];
  fields: MasterFieldDef[];
};

function categoryLabel(
  map: Record<string, string>,
  value: unknown,
): string {
  if (typeof value !== "string") return "—";
  return map[value] ?? value;
}

function usageBadge(row: Record<string, unknown>): string {
  const isActive = row.isActive !== false;
  const count = Number(row.usageCount ?? 0);
  if (!isActive) return "Đã lưu trữ";
  if (count > 0) return "Đang dùng";
  return "Chưa dùng";
}

export const PRODUCTION_MATERIAL_ADMIN: MasterAdminConfig = {
  kind: "material",
  title: "Vật liệu sản xuất",
  listPath: "/admin/production-materials",
  apiPath: "/api/production-materials",
  createLabel: "Tên vật liệu",
  columns: [
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên" },
    {
      key: "category",
      label: "Danh mục",
      render: (row) => categoryLabel(PRODUCTION_MATERIAL_CATEGORY_LABELS, row.category),
    },
    { key: "composition", label: "Thành phần", render: (row) => String(row.composition ?? "—") },
    {
      key: "supplier",
      label: "NCC",
      render: (row) => {
        const s = row.supplier as { name?: string } | null | undefined;
        return s?.name ?? "—";
      },
    },
    {
      key: "statusBadge",
      label: "Sử dụng",
      render: (row) => usageBadge(row),
    },
    {
      key: "usageCount",
      label: "Tech Pack BOM",
      render: (row) => {
        const count = Number(row.usageCount ?? 0);
        return count > 0 ? String(count) : "—";
      },
    },
  ],
  fields: [
    { key: "name", label: "Tên", type: "text" },
    {
      key: "category",
      label: "Danh mục",
      type: "select",
      options: PRODUCTION_MATERIAL_CATEGORIES.map((v) => ({
        value: v,
        label: PRODUCTION_MATERIAL_CATEGORY_LABELS[v],
      })),
    },
    { key: "composition", label: "Thành phần", type: "text" },
    { key: "gsm", label: "GSM", type: "text" },
    { key: "width", label: "Khổ rộng", type: "text" },
    { key: "supplierId", label: "Nhà cung cấp", type: "supplier-select" },
    { key: "defaultColor", label: "Màu mặc định", type: "text" },
    { key: "notes", label: "Ghi chú", type: "textarea", fullWidth: true },
    { key: "isActive", label: "Đang sử dụng", type: "checkbox" },
  ],
};

export const PRODUCTION_TRIM_ADMIN: MasterAdminConfig = {
  kind: "trim",
  title: "Phụ liệu sản xuất",
  listPath: "/admin/trims",
  apiPath: "/api/production-trims",
  createLabel: "Tên phụ liệu",
  columns: [
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên" },
    {
      key: "category",
      label: "Danh mục",
      render: (row) => categoryLabel(PRODUCTION_TRIM_CATEGORY_LABELS, row.category),
    },
    {
      key: "supplier",
      label: "NCC",
      render: (row) => {
        const s = row.supplier as { name?: string } | null | undefined;
        return s?.name ?? "—";
      },
    },
    {
      key: "statusBadge",
      label: "Sử dụng",
      render: (row) => usageBadge(row),
    },
    {
      key: "usageCount",
      label: "Tech Pack BOM",
      render: (row) => {
        const count = Number(row.usageCount ?? 0);
        return count > 0 ? String(count) : "—";
      },
    },
  ],
  fields: [
    { key: "name", label: "Tên", type: "text" },
    {
      key: "category",
      label: "Danh mục",
      type: "select",
      options: PRODUCTION_TRIM_CATEGORIES.map((v) => ({
        value: v,
        label: PRODUCTION_TRIM_CATEGORY_LABELS[v],
      })),
    },
    { key: "supplierId", label: "Nhà cung cấp", type: "supplier-select" },
    { key: "notes", label: "Ghi chú", type: "textarea", fullWidth: true },
    { key: "isActive", label: "Đang sử dụng", type: "checkbox" },
  ],
};

export const PRODUCTION_SUPPLIER_ADMIN: MasterAdminConfig = {
  kind: "supplier",
  title: "Nhà cung cấp",
  listPath: "/admin/production-suppliers",
  apiPath: "/api/production-suppliers",
  createLabel: "Tên nhà cung cấp",
  columns: [
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên" },
    {
      key: "category",
      label: "Loại",
      render: (row) => categoryLabel(SUPPLIER_CATEGORY_LABELS, row.category),
    },
    { key: "contact", label: "Liên hệ", render: (row) => String(row.contact ?? "—") },
    { key: "email", label: "Email", render: (row) => String(row.email ?? "—") },
    { key: "phone", label: "Điện thoại", render: (row) => String(row.phone ?? "—") },
    {
      key: "statusBadge",
      label: "Sử dụng",
      render: (row) => usageBadge(row),
    },
    {
      key: "usageCount",
      label: "Tham chiếu",
      render: (row) => {
        const count = Number(row.usageCount ?? 0);
        return count > 0 ? String(count) : "—";
      },
    },
  ],
  fields: [
    { key: "name", label: "Tên", type: "text" },
    {
      key: "category",
      label: "Loại nhà cung cấp",
      type: "select",
      options: SUPPLIER_CATEGORIES.map((value) => ({
        value,
        label: SUPPLIER_CATEGORY_LABELS[value] ?? value,
      })),
    },
    { key: "contact", label: "Người liên hệ", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Điện thoại", type: "text" },
    { key: "address", label: "Địa chỉ", type: "textarea", fullWidth: true },
    { key: "notes", label: "Ghi chú", type: "textarea", fullWidth: true },
    { key: "isActive", label: "Đang sử dụng", type: "checkbox" },
  ],
};

export const PRINT_METHOD_ADMIN: MasterAdminConfig = {
  kind: "print-method",
  title: "Công nghệ in / thêu",
  listPath: "/admin/print-methods",
  apiPath: "/api/print-methods",
  createLabel: "Tên công nghệ",
  columns: [
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên" },
    {
      key: "category",
      label: "Danh mục",
      render: (row) => categoryLabel(PRINT_METHOD_CATEGORY_LABELS, row.category),
    },
    {
      key: "statusBadge",
      label: "Sử dụng",
      render: (row) => usageBadge(row),
    },
    {
      key: "usageCount",
      label: "Artwork",
      render: (row) => {
        const count = Number(row.usageCount ?? 0);
        return count > 0 ? String(count) : "—";
      },
    },
  ],
  fields: [
    { key: "name", label: "Tên", type: "text" },
    {
      key: "category",
      label: "Danh mục",
      type: "select",
      options: PRINT_METHOD_CATEGORIES.map((v) => ({
        value: v,
        label: PRINT_METHOD_CATEGORY_LABELS[v],
      })),
    },
    { key: "description", label: "Mô tả", type: "textarea", fullWidth: true },
    { key: "isActive", label: "Đang sử dụng", type: "checkbox" },
  ],
};
