import type { CustomerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CRM_CUSTOMER_STATUSES } from "@/features/crm/types";

const MAX_BULK_CUSTOMERS = 200;

type BulkFieldPatch = {
  enabled?: unknown;
  value?: unknown;
};

type BulkPatchInput = {
  status?: BulkFieldPatch;
  customerTypeId?: BulkFieldPatch;
  province?: BulkFieldPatch;
  district?: BulkFieldPatch;
  wardNameSnapshot?: BulkFieldPatch;
  internalNoteAppend?: BulkFieldPatch;
  billingNoteAppend?: BulkFieldPatch;
};

type BulkUpdateInput = {
  customerIds: unknown;
  patch: unknown;
  actorId?: string | null;
};

export type CustomerBulkUpdateResult = {
  summary: {
    requested: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    customerId: string;
    customerName: string;
    reason: string;
  }>;
};

const ALLOWED_PATCH_FIELDS = new Set([
  "status",
  "customerTypeId",
  "province",
  "district",
  "wardNameSnapshot",
  "internalNoteAppend",
  "billingNoteAppend",
]);

const FIELD_LABELS: Record<string, string> = {
  status: "Customer Status",
  customerTypeId: "Customer Type",
  province: "Province",
  district: "District",
  wardNameSnapshot: "Ward",
  internalNoteAppend: "Internal Notes append",
  billingNoteAppend: "Billing Notes append",
};

function enabledField(field: unknown): field is BulkFieldPatch {
  return !!field && typeof field === "object" && (field as BulkFieldPatch).enabled === true;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function appendNote(existing: string | null, text: string, now: Date) {
  const timestamp = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
  const entry = `[Bulk update ${timestamp}] ${text}`;
  return [existing?.trim(), entry].filter(Boolean).join("\n\n");
}

function normalizeCustomerIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new Error("Vui lòng chọn ít nhất 1 khách hàng.");
  }
  const ids = raw.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 khách hàng.");
  }
  if (ids.length > MAX_BULK_CUSTOMERS) {
    throw new Error("Không thể cập nhật quá 200 khách hàng mỗi lần.");
  }
  return ids;
}

async function buildBulkData(rawPatch: unknown) {
  if (!rawPatch || typeof rawPatch !== "object") {
    throw new Error("Vui lòng bật ít nhất 1 trường cần cập nhật.");
  }

  const patch = rawPatch as BulkPatchInput & Record<string, unknown>;
  const unknownFields = Object.keys(patch).filter((key) => !ALLOWED_PATCH_FIELDS.has(key));
  if (unknownFields.length > 0) {
    throw new Error(`Trường bulk update không được hỗ trợ: ${unknownFields.join(", ")}.`);
  }

  const enabledEntries = Object.entries(patch).filter(([, field]) => enabledField(field));
  if (enabledEntries.length === 0) {
    throw new Error("Vui lòng bật ít nhất 1 trường cần cập nhật.");
  }

  const data: Prisma.CustomerUpdateInput = {};
  const append: { internal?: string; billing?: string } = {};
  const changedFields: string[] = [];

  if (enabledField(patch.status)) {
    const status = stringValue(patch.status.value).toUpperCase();
    if (!CRM_CUSTOMER_STATUSES.includes(status as CustomerStatus)) {
      throw new Error("Trạng thái khách hàng không hợp lệ.");
    }
    data.status = status as CustomerStatus;
    changedFields.push(FIELD_LABELS.status);
  }

  if (enabledField(patch.customerTypeId)) {
    const customerTypeId = stringValue(patch.customerTypeId.value);
    if (customerTypeId) {
      const type = await prisma.customerType.findFirst({
        where: { id: customerTypeId, isActive: true },
        select: { id: true },
      });
      if (!type) {
        throw new Error("Loại khách hàng không hợp lệ hoặc đã ngưng sử dụng.");
      }
      data.customerType = { connect: { id: customerTypeId } };
    } else {
      data.customerType = { disconnect: true };
    }
    changedFields.push(FIELD_LABELS.customerTypeId);
  }

  if (enabledField(patch.province)) {
    data.province = stringValue(patch.province.value) || null;
    data.provinceNameSnapshot = stringValue(patch.province.value) || null;
    changedFields.push(FIELD_LABELS.province);
  }

  if (enabledField(patch.district)) {
    data.district = stringValue(patch.district.value) || null;
    changedFields.push(FIELD_LABELS.district);
  }

  if (enabledField(patch.wardNameSnapshot)) {
    data.wardNameSnapshot = stringValue(patch.wardNameSnapshot.value) || null;
    changedFields.push(FIELD_LABELS.wardNameSnapshot);
  }

  if (enabledField(patch.internalNoteAppend)) {
    append.internal = stringValue(patch.internalNoteAppend.value);
    if (!append.internal) throw new Error("Ghi chú nội bộ append không được để trống.");
    changedFields.push(FIELD_LABELS.internalNoteAppend);
  }

  if (enabledField(patch.billingNoteAppend)) {
    append.billing = stringValue(patch.billingNoteAppend.value);
    if (!append.billing) throw new Error("Ghi chú thanh toán append không được để trống.");
    changedFields.push(FIELD_LABELS.billingNoteAppend);
  }

  return { data, append, changedFields };
}

export async function bulkUpdateCustomers(input: BulkUpdateInput): Promise<CustomerBulkUpdateResult> {
  const customerIds = normalizeCustomerIds(input.customerIds);
  const { data, append, changedFields } = await buildBulkData(input.patch);
  const requested = customerIds.length;
  const uniqueIds = [...new Set(customerIds)];
  const now = new Date();
  const result: CustomerBulkUpdateResult = {
    summary: { requested, updated: 0, skipped: 0, errors: 0 },
    errors: [],
  };

  const customers = await prisma.customer.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, internalNote: true, billingNote: true },
  });
  const byId = new Map(customers.map((customer) => [customer.id, customer]));

  for (const id of uniqueIds) {
    const customer = byId.get(id);
    if (!customer) {
      result.summary.errors += 1;
      result.errors.push({
        customerId: id,
        customerName: "",
        reason: "Không tìm thấy khách hàng.",
      });
      continue;
    }

    try {
      const rowData: Prisma.CustomerUpdateInput = { ...data };
      if (append.internal) {
        rowData.internalNote = appendNote(customer.internalNote, append.internal, now);
      }
      if (append.billing) {
        rowData.billingNote = appendNote(customer.billingNote, append.billing, now);
      }

      await prisma.$transaction([
        prisma.customer.update({
          where: { id },
          data: rowData,
        }),
        prisma.cRMActivity.create({
          data: {
            customerId: id,
            type: "NOTE",
            title: "Cập nhật hàng loạt khách hàng",
            content: `Trường đã cập nhật: ${changedFields.join(", ")}`,
            createdBy: input.actorId ?? null,
          },
        }),
      ]);
      result.summary.updated += 1;
    } catch (err) {
      console.error("[CRM] bulkUpdateCustomers row failed:", err);
      result.summary.errors += 1;
      result.errors.push({
        customerId: id,
        customerName: customer.name,
        reason: "Không thể cập nhật khách hàng.",
      });
    }
  }

  const duplicateSelections = requested - uniqueIds.length;
  if (duplicateSelections > 0) {
    result.summary.skipped += duplicateSelections;
  }

  return result;
}
