import type { DealerRFQPriority, DealerRFQProjectType, DealerRFQStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateDealerRFQCode } from "@/features/dealer/dealer-rfq-code";
import type {
  CreateDealerRFQInput,
  DealerRFQItemInput,
  DealerRFQItemRecord,
  DealerRFQRecord,
  DealerRFQSummary,
  ListDealerRFQsFilters,
  UpdateDealerRFQInput,
} from "@/features/dealer/dealer-rfq.types";
import { DealerValidationError, normalizeOptionalString } from "@/features/dealer/dealer-validation";
import { createDealerActivity } from "@/features/dealer/services/dealer-activity.service";
import { createCrmLead, linkLeadToExistingCustomer } from "@/features/crm/services/crm-lead.service";
import {
  DEALER_RFQ_PROJECT_TYPE_LABELS,
  DEALER_RFQ_STATUS_LABELS,
} from "@/features/dealer/dealer-rfq.types";

const RFQ_INCLUDE = {
  items: { orderBy: { createdAt: "asc" as const } },
  dealerCompany: { select: { id: true, name: true, code: true, customerId: true } },
  dealerUser: { select: { id: true, name: true, email: true } },
  customer: { select: { id: true, name: true, code: true } },
  lead: { select: { id: true, code: true } },
} satisfies Prisma.DealerRFQInclude;

function parseArtworkUrls(value: Prisma.JsonValue | null): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return null;
}

function mapItem(row: {
  id: string;
  rfqId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  skuSnapshot: string | null;
  colorSnapshot: string | null;
  quantity: number;
  decorationType: string | null;
  position: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DealerRFQItemRecord {
  return {
    id: row.id,
    rfqId: row.rfqId,
    productId: row.productId,
    variantId: row.variantId,
    productName: row.productName,
    variantName: row.variantName,
    skuSnapshot: row.skuSnapshot,
    colorSnapshot: row.colorSnapshot,
    quantity: row.quantity,
    decorationType: row.decorationType,
    position: row.position,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRfq(
  row: Prisma.DealerRFQGetPayload<{ include: typeof RFQ_INCLUDE }>,
): DealerRFQRecord {
  return {
    id: row.id,
    code: row.code,
    dealerCompanyId: row.dealerCompanyId,
    dealerUserId: row.dealerUserId,
    customerId: row.customerId,
    leadId: row.leadId,
    quoteId: row.quoteId,
    pricingCalculationId: row.pricingCalculationId,
    title: row.title,
    projectType: row.projectType,
    status: row.status,
    priority: row.priority,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    companyName: row.companyName,
    productSummary: row.productSummary,
    quantity: row.quantity,
    targetBudget: row.targetBudget?.toString() ?? null,
    deadline: row.deadline?.toISOString() ?? null,
    deliveryLocation: row.deliveryLocation,
    artworkStatus: row.artworkStatus,
    artworkUrls: parseArtworkUrls(row.artworkUrls),
    note: row.note,
    internalNote: row.internalNote,
    assignedToAdminUserId: row.assignedToAdminUserId,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    quotedAt: row.quotedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(mapItem),
    dealerCompany: row.dealerCompany,
    dealerUser: row.dealerUser,
    customer: row.customer,
    lead: row.lead,
  };
}

function parseDeadline(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBudget(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function validateCreateInput(input: CreateDealerRFQInput): void {
  const title = input.title?.trim();
  if (!title) throw new DealerValidationError("Tiêu đề RFQ là bắt buộc.");
  const hasSummary = Boolean(input.productSummary?.trim());
  const hasItems = (input.items?.length ?? 0) > 0;
  if (!hasSummary && !hasItems) {
    throw new DealerValidationError("Vui lòng nhập mô tả sản phẩm hoặc ít nhất một dòng hàng.");
  }
  if (input.quantity != null && input.quantity < 1) {
    throw new DealerValidationError("Số lượng phải lớn hơn 0.");
  }
  for (const item of input.items ?? []) {
    if (!item.productName?.trim()) {
      throw new DealerValidationError("Tên sản phẩm trong dòng hàng là bắt buộc.");
    }
    if (!item.quantity || item.quantity < 1) {
      throw new DealerValidationError("Số lượng dòng hàng phải lớn hơn 0.");
    }
  }
}

function buildItemCreateData(items: DealerRFQItemInput[]): Prisma.DealerRFQItemCreateWithoutRfqInput[] {
  return items.map((item) => ({
    productId: item.productId ?? null,
    variantId: item.variantId ?? null,
    productName: item.productName.trim(),
    variantName: normalizeOptionalString(item.variantName),
    skuSnapshot: normalizeOptionalString(item.skuSnapshot),
    colorSnapshot: normalizeOptionalString(item.colorSnapshot),
    quantity: item.quantity,
    decorationType: normalizeOptionalString(item.decorationType),
    position: normalizeOptionalString(item.position),
    note: normalizeOptionalString(item.note),
  }));
}

function buildWhere(filters: ListDealerRFQsFilters): Prisma.DealerRFQWhereInput {
  const where: Prisma.DealerRFQWhereInput = {};
  if (filters.dealerCompanyId) where.dealerCompanyId = filters.dealerCompanyId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.projectType) where.projectType = filters.projectType;
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { productSummary: { contains: q, mode: "insensitive" } },
      { dealerCompany: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function listDealerRFQs(
  filters: ListDealerRFQsFilters = {},
): Promise<{ rfqs: DealerRFQRecord[]; total: number }> {
  const take = Math.min(200, Math.max(1, filters.limit ?? 50));
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.dealerRFQ.findMany({
      where,
      include: RFQ_INCLUDE,
      orderBy: [{ updatedAt: "desc" }],
      take,
    }),
    prisma.dealerRFQ.count({ where }),
  ]);
  return { rfqs: rows.map(mapRfq), total };
}

export async function listDealerRFQsForCompany(
  dealerCompanyId: string,
  filters: Omit<ListDealerRFQsFilters, "dealerCompanyId"> = {},
): Promise<{ rfqs: DealerRFQRecord[]; total: number }> {
  return listDealerRFQs({ ...filters, dealerCompanyId });
}

export async function getDealerRFQById(id: string): Promise<DealerRFQRecord | null> {
  const row = await prisma.dealerRFQ.findUnique({ where: { id }, include: RFQ_INCLUDE });
  return row ? mapRfq(row) : null;
}

export async function getDealerRFQForCompany(
  id: string,
  dealerCompanyId: string,
): Promise<DealerRFQRecord | null> {
  const row = await prisma.dealerRFQ.findFirst({
    where: { id, dealerCompanyId },
    include: RFQ_INCLUDE,
  });
  return row ? mapRfq(row) : null;
}

export async function createDealerRFQ(input: CreateDealerRFQInput): Promise<DealerRFQRecord> {
  validateCreateInput(input);
  const code = await generateDealerRFQCode();
  const items = input.items ?? [];
  const now = new Date();
  const shouldSubmit = Boolean(input.submit);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.dealerRFQ.create({
      data: {
        code,
        dealerCompanyId: input.dealerCompanyId,
        dealerUserId: input.dealerUserId ?? null,
        title: input.title.trim(),
        projectType: input.projectType ?? "OTHER",
        priority: input.priority ?? "NORMAL",
        status: shouldSubmit ? "SUBMITTED" : "DRAFT",
        contactName: normalizeOptionalString(input.contactName),
        contactEmail: normalizeOptionalString(input.contactEmail),
        contactPhone: normalizeOptionalString(input.contactPhone),
        companyName: normalizeOptionalString(input.companyName),
        productSummary: normalizeOptionalString(input.productSummary),
        quantity: input.quantity ?? null,
        targetBudget: parseBudget(input.targetBudget),
        deadline: parseDeadline(input.deadline),
        deliveryLocation: normalizeOptionalString(input.deliveryLocation),
        artworkStatus: input.artworkStatus ?? "NOT_PROVIDED",
        artworkUrls: input.artworkUrls?.length ? input.artworkUrls : undefined,
        note: normalizeOptionalString(input.note),
        submittedAt: shouldSubmit ? now : null,
        items: items.length ? { create: buildItemCreateData(items) } : undefined,
      },
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: input.dealerCompanyId,
        dealerUserId: input.dealerUserId ?? null,
        type: "CREATED",
        title: shouldSubmit ? "Gửi RFQ B2B" : "Tạo RFQ nháp",
        description: `${created.code} — ${created.title}`,
        metadata: { rfqId: created.id, status: created.status },
      },
    });

    return created;
  });

  return mapRfq(row);
}

export async function updateDealerRFQ(
  id: string,
  input: UpdateDealerRFQInput,
  options?: { dealerCompanyId?: string },
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findFirst({
    where: { id, ...(options?.dealerCompanyId ? { dealerCompanyId: options.dealerCompanyId } : {}) },
    include: { items: true },
  });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");
  if (options?.dealerCompanyId && existing.status !== "DRAFT") {
    throw new DealerValidationError("Chỉ có thể chỉnh sửa RFQ ở trạng thái nháp.");
  }

  const data: Prisma.DealerRFQUpdateInput = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new DealerValidationError("Tiêu đề RFQ là bắt buộc.");
    data.title = title;
  }
  if (input.projectType !== undefined) data.projectType = input.projectType;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.contactName !== undefined) data.contactName = normalizeOptionalString(input.contactName);
  if (input.contactEmail !== undefined) data.contactEmail = normalizeOptionalString(input.contactEmail);
  if (input.contactPhone !== undefined) data.contactPhone = normalizeOptionalString(input.contactPhone);
  if (input.companyName !== undefined) data.companyName = normalizeOptionalString(input.companyName);
  if (input.productSummary !== undefined) data.productSummary = normalizeOptionalString(input.productSummary);
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.targetBudget !== undefined) data.targetBudget = parseBudget(input.targetBudget);
  if (input.deadline !== undefined) data.deadline = parseDeadline(input.deadline);
  if (input.deliveryLocation !== undefined) {
    data.deliveryLocation = normalizeOptionalString(input.deliveryLocation);
  }
  if (input.artworkStatus !== undefined) data.artworkStatus = input.artworkStatus;
  if (input.artworkUrls !== undefined) {
    data.artworkUrls = input.artworkUrls?.length ? input.artworkUrls : Prisma.DbNull;
  }
  if (input.note !== undefined) data.note = normalizeOptionalString(input.note);
  if (input.internalNote !== undefined) data.internalNote = normalizeOptionalString(input.internalNote);
  if (input.assignedToAdminUserId !== undefined) {
    data.assignedToAdminUser = input.assignedToAdminUserId
      ? { connect: { id: input.assignedToAdminUserId } }
      : { disconnect: true };
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data,
      include: RFQ_INCLUDE,
    });

    if (input.items) {
      await upsertDealerRFQItemsInTx(tx, id, input.items);
    }

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        dealerUserId: existing.dealerUserId,
        type: "UPDATED",
        title: "Cập nhật RFQ",
        description: `${existing.code}`,
        metadata: { rfqId: id },
      },
    });

    return tx.dealerRFQ.findUniqueOrThrow({ where: { id }, include: RFQ_INCLUDE });
  });

  return mapRfq(row);
}

async function upsertDealerRFQItemsInTx(
  tx: Prisma.TransactionClient,
  rfqId: string,
  items: DealerRFQItemInput[],
): Promise<void> {
  await tx.dealerRFQItem.deleteMany({ where: { rfqId } });
  if (items.length === 0) return;
  for (const item of items) {
    if (!item.productName?.trim()) {
      throw new DealerValidationError("Tên sản phẩm trong dòng hàng là bắt buộc.");
    }
    if (!item.quantity || item.quantity < 1) {
      throw new DealerValidationError("Số lượng dòng hàng phải lớn hơn 0.");
    }
  }
  await tx.dealerRFQItem.createMany({
    data: items.map((item) => ({
      rfqId,
      productId: item.productId ?? null,
      variantId: item.variantId ?? null,
      productName: item.productName.trim(),
      variantName: normalizeOptionalString(item.variantName),
      skuSnapshot: normalizeOptionalString(item.skuSnapshot),
      colorSnapshot: normalizeOptionalString(item.colorSnapshot),
      quantity: item.quantity,
      decorationType: normalizeOptionalString(item.decorationType),
      position: normalizeOptionalString(item.position),
      note: normalizeOptionalString(item.note),
    })),
  });
}

export async function upsertDealerRFQItems(
  rfqId: string,
  items: DealerRFQItemInput[],
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findUnique({ where: { id: rfqId } });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");

  await prisma.$transaction(async (tx) => {
    await upsertDealerRFQItemsInTx(tx, rfqId, items);
  });

  const row = await prisma.dealerRFQ.findUniqueOrThrow({ where: { id: rfqId }, include: RFQ_INCLUDE });
  return mapRfq(row);
}

export async function submitDealerRFQ(
  id: string,
  options?: { dealerCompanyId?: string },
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findFirst({
    where: { id, ...(options?.dealerCompanyId ? { dealerCompanyId: options.dealerCompanyId } : {}) },
    include: { items: true },
  });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");
  if (existing.status !== "DRAFT") {
    throw new DealerValidationError("Chỉ có thể gửi RFQ ở trạng thái nháp.");
  }
  if (!existing.productSummary?.trim() && existing.items.length === 0) {
    throw new DealerValidationError("Vui lòng nhập mô tả sản phẩm hoặc ít nhất một dòng hàng.");
  }

  const now = new Date();
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: now },
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        dealerUserId: existing.dealerUserId,
        type: "UPDATED",
        title: "Gửi RFQ B2B",
        description: `${existing.code}`,
        metadata: { rfqId: id, status: "SUBMITTED" },
      },
    });

    return updated;
  });

  return mapRfq(row);
}

export async function updateDealerRFQStatus(
  id: string,
  status: DealerRFQRecord["status"],
  note?: string | null,
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findUnique({ where: { id } });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");

  const now = new Date();
  const data: Prisma.DealerRFQUpdateInput = { status };
  if (status === "QUOTED") data.quotedAt = now;
  if (status === "WON" || status === "LOST" || status === "CANCELLED") data.closedAt = now;
  if (note !== undefined) data.internalNote = normalizeOptionalString(note);

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data,
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        dealerUserId: existing.dealerUserId,
        type: "UPDATED",
        title: `RFQ → ${DEALER_RFQ_STATUS_LABELS[status]}`,
        description: `${existing.code}`,
        metadata: { rfqId: id, from: existing.status, to: status },
      },
    });

    return updated;
  });

  return mapRfq(row);
}

export async function assignDealerRFQ(
  id: string,
  adminUserId: string | null,
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findUnique({ where: { id } });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");

  if (adminUserId) {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
    if (!admin || !admin.isActive) {
      throw new DealerValidationError("Người phụ trách không hợp lệ.");
    }
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data: {
        assignedToAdminUserId: adminUserId,
      },
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        type: "UPDATED",
        title: "Gán người phụ trách RFQ",
        description: existing.code,
        metadata: { rfqId: id, assignedToAdminUserId: adminUserId },
      },
    });

    return updated;
  });

  return mapRfq(row);
}

export async function linkDealerRFQToCustomer(
  id: string,
  customerId: string,
): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findUnique({ where: { id } });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new DealerValidationError("Không tìm thấy khách hàng CRM.");

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data: { customerId },
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        type: "CRM_LINKED",
        title: "Liên kết RFQ với khách hàng CRM",
        description: `${existing.code} → ${customer.code}`,
        metadata: { rfqId: id, customerId },
      },
    });

    return updated;
  });

  return mapRfq(row);
}

function buildLeadNoteFromRfq(
  rfq: {
    code: string;
    projectType: DealerRFQRecord["projectType"];
    quantity: number | null;
    deadline: Date | null;
    targetBudget: { toString(): string } | null;
    deliveryLocation: string | null;
    productSummary: string | null;
    note: string | null;
    items: Array<{ productName: string; skuSnapshot: string | null; quantity: number }>;
  },
): string {
  const lines = [
    `Mã RFQ: ${rfq.code}`,
    `Loại dự án: ${DEALER_RFQ_PROJECT_TYPE_LABELS[rfq.projectType]}`,
    rfq.quantity ? `Số lượng: ${rfq.quantity}` : null,
    rfq.deadline ? `Deadline: ${rfq.deadline.toISOString()}` : null,
    rfq.targetBudget ? `Ngân sách mục tiêu: ${rfq.targetBudget}` : null,
    rfq.deliveryLocation ? `Giao hàng: ${rfq.deliveryLocation}` : null,
    rfq.productSummary ? `Mô tả: ${rfq.productSummary}` : null,
    rfq.items.length
      ? `Dòng hàng:\n${rfq.items
          .map(
            (item, i) =>
              `${i + 1}. ${item.productName}${item.skuSnapshot ? ` (${item.skuSnapshot})` : ""} x${item.quantity}`,
          )
          .join("\n")}`
      : null,
    rfq.note ? `Ghi chú đại lý: ${rfq.note}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function convertDealerRFQToLead(id: string): Promise<DealerRFQRecord> {
  const rfq = await prisma.dealerRFQ.findUnique({
    where: { id },
    include: { items: true, dealerCompany: { select: { id: true, name: true, customerId: true } } },
  });
  if (!rfq) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");
  if (rfq.leadId) throw new DealerValidationError("RFQ đã được chuyển sang Lead CRM.");

  const leadNote = buildLeadNoteFromRfq({
    code: rfq.code,
    projectType: rfq.projectType,
    quantity: rfq.quantity,
    deadline: rfq.deadline,
    targetBudget: rfq.targetBudget,
    deliveryLocation: rfq.deliveryLocation,
    productSummary: rfq.productSummary,
    note: rfq.note,
    items: rfq.items,
  });
  const lead = await createCrmLead({
    source: "DEALER",
    sourceDetail: `B2B Portal RFQ ${rfq.code}`,
    contactName: rfq.contactName ?? undefined,
    companyName: rfq.companyName ?? rfq.dealerCompany.name,
    phone: rfq.contactPhone ?? "—",
    email: rfq.contactEmail ?? undefined,
    message: rfq.note ?? undefined,
    demand: rfq.productSummary ?? undefined,
    note: leadNote,
    productInterests: rfq.items.map((item) => ({
      productId: item.productId ?? undefined,
      variantId: item.variantId ?? undefined,
      productNameSnapshot: item.productName,
      quantity: item.quantity,
      requirementNote: [item.decorationType, item.position, item.note].filter(Boolean).join(" · ") || undefined,
    })),
  });

  if (!lead) throw new DealerValidationError("Không thể tạo Lead CRM từ RFQ.");

  const customerId = rfq.customerId ?? rfq.dealerCompany.customerId ?? null;
  if (customerId) {
    await linkLeadToExistingCustomer(lead.id, { customerId, createContact: true });
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerRFQ.update({
      where: { id },
      data: {
        leadId: lead.id,
        customerId: customerId ?? undefined,
      },
      include: RFQ_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: rfq.dealerCompanyId,
        type: "CRM_LINKED",
        title: "Chuyển RFQ sang Lead CRM",
        description: `${rfq.code} → ${lead.code ?? lead.id}`,
        metadata: { rfqId: id, leadId: lead.id },
      },
    });

    return updated;
  });

  return mapRfq(row);
}

export async function linkDealerRFQToQuote(id: string, quoteId: string): Promise<DealerRFQRecord> {
  const existing = await prisma.dealerRFQ.findUnique({ where: { id } });
  if (!existing) throw new DealerValidationError("Không tìm thấy yêu cầu báo giá.");

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new DealerValidationError("Không tìm thấy báo giá.");

  const row = await prisma.dealerRFQ.update({
    where: { id },
    data: { quoteId, status: existing.status === "PRICING" ? "QUOTED" : existing.status },
    include: RFQ_INCLUDE,
  });

  return mapRfq(row);
}

export async function getDealerRFQSummary(dealerCompanyId: string): Promise<DealerRFQSummary> {
  const [submitted, inProgress, quoted, needInfo] = await Promise.all([
    prisma.dealerRFQ.count({ where: { dealerCompanyId, status: "SUBMITTED" } }),
    prisma.dealerRFQ.count({
      where: { dealerCompanyId, status: { in: ["REVIEWING", "PRICING"] } },
    }),
    prisma.dealerRFQ.count({ where: { dealerCompanyId, status: "QUOTED" } }),
    prisma.dealerRFQ.count({ where: { dealerCompanyId, status: "NEED_MORE_INFO" } }),
  ]);
  return { submitted, inProgress, quoted, needInfo };
}

export { generateDealerRFQCode } from "@/features/dealer/dealer-rfq-code";
