import type { LeadStatus, QuoteSourceType, QuoteStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { customerToQuoteSnapshots, contactToQuoteSnapshots } from "@/features/quotes/quote-party-utils";
import { getCompanySettings } from "@/features/settings/services/settings.service";
import { getPricingCalculationDetail } from "@/features/pricing/services/pricing-calculation.service";
import {
  DEFAULT_QUOTE_TERMS,
  defaultValidUntil,
  generatePublicToken,
  generateQuoteNo,
} from "@/features/quotes/quote-code";
import { allocateQuotePublicShortCode } from "@/features/quotes/quote-public-link.service";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import { formatPublicQuoteDocument, formatQuotePdfData } from "@/features/quotes/quote-document";
import { validateContactBelongsToCustomer } from "@/features/crm/services/crm-contact.service";
import {
  getDefaultSalesRepresentative,
  salesRepToQuoteSnapshots,
} from "@/features/sales/services/sales-representative.service";
import type { CreateQuoteInput, QuoteItemInput, QuoteListRecord } from "@/features/quotes/types";

async function validateQuoteCustomerContact(
  customerId: string | null | undefined,
  contactId: string | null | undefined,
) {
  if (!customerId || !contactId) return;
  const valid = await validateContactBelongsToCustomer(customerId, contactId);
  if (!valid) {
    throw new QuoteValidationError("Người liên hệ không thuộc khách hàng đã chọn.");
  }
}

export class QuoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteValidationError";
  }
}

const TERMINAL_LEAD_STATUSES: LeadStatus[] = ["WON", "LOST", "NOT_FIT"];

function decimalToNum(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function validateQuoteItems(items: QuoteItemInput[]) {
  if (!items.length) throw new QuoteValidationError("Cần ít nhất một dòng sản phẩm/dịch vụ.");
  items.forEach((item, index) => {
    const name = item.productNameSnapshot?.trim();
    if (!name && !item.productId) {
      throw new QuoteValidationError(`Dòng ${index + 1}: cần tên sản phẩm hoặc chọn sản phẩm.`);
    }
    if (item.quantity < 1) {
      throw new QuoteValidationError(`Dòng ${index + 1}: số lượng phải >= 1.`);
    }
    const unitPrice = item.manualUnitPrice ?? item.unitPrice ?? item.baseUnitPrice ?? 0;
    if (unitPrice < 0) {
      throw new QuoteValidationError(`Dòng ${index + 1}: đơn giá phải >= 0.`);
    }
    if ((item.discountAmount ?? 0) < 0) {
      throw new QuoteValidationError(`Dòng ${index + 1}: chiết khấu phải >= 0.`);
    }
  });
}

function mapListRow(row: {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  title: string | null;
  totalAmount: Prisma.Decimal;
  manualOverride: boolean;
  manualTotalAmount: Prisma.Decimal | null;
  validUntil: Date | null;
  createdAt: Date;
  lead?: { fullName: string; company: string | null; companyName: string | null } | null;
  customer?: { name: string } | null;
}): QuoteListRecord {
  const leadLabel = row.lead
    ? [row.lead.fullName, row.lead.companyName ?? row.lead.company].filter(Boolean).join(" · ")
    : null;
  return {
    id: row.id,
    quoteNo: row.quoteNo,
    status: row.status,
    title: row.title,
    totalAmount: row.totalAmount.toNumber(),
    manualOverride: row.manualOverride,
    manualTotalAmount: decimalToNum(row.manualTotalAmount),
    validUntil: row.validUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    leadLabel,
    customerLabel: row.customer?.name ?? null,
  };
}

function buildItemCreateData(
  quoteId: string,
  items: ReturnType<typeof computeQuoteFromItems>["items"]
) {
  return items.map((item, index) => ({
    quoteId,
    pricingCalculationItemId: item.pricingCalculationItemId ?? null,
    productId: item.productId ?? null,
    variantId: item.variantId ?? null,
    productNameSnapshot: item.productNameSnapshot?.trim() || "Sản phẩm/dịch vụ",
    variantNameSnapshot: item.variantNameSnapshot ?? null,
    description: item.description ?? null,
    designMediaAssetId: item.designMediaAssetId ?? null,
    designImageUrl: item.designImageUrl ?? null,
    skuSnapshot: item.skuSnapshot ?? null,
    colorSnapshot: item.colorSnapshot ?? null,
    categorySnapshot: item.categorySnapshot ?? null,
    genderSnapshot: item.genderSnapshot ?? null,
    moqSnapshot: item.moqSnapshot ?? null,
    itemNote: item.itemNote ?? null,
    productionLeadTime: item.productionLeadTime ?? null,
    sampleFee: item.sampleFee ?? null,
    sampleLeadTime: item.sampleLeadTime ?? null,
    quantity: item.quantity,
    unit: item.unit ?? "cái",
    baseUnitPrice: item.baseUnitPrice ?? 0,
    serviceFee: item.serviceFee ?? 0,
    setupFee: item.setupFee ?? 0,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount ?? 0,
    lineSubtotal: item.lineSubtotal,
    lineTotal: item.lineTotal,
    pricingSnapshot: (item.pricingSnapshot ?? null) as Prisma.InputJsonValue,
    manualOverride: item.manualOverride,
    manualUnitPrice: item.manualUnitPrice ?? null,
    manualOverrideReason: item.manualOverrideReason ?? null,
    sortOrder: item.sortOrder ?? index,
  }));
}

async function logQuoteActivity(
  tx: Prisma.TransactionClient,
  params: {
    leadId?: string | null;
    customerId?: string | null;
    contactId?: string | null;
    title: string;
    content?: string | null;
  }
) {
  if (!params.leadId && !params.customerId) return;
  await tx.cRMActivity.create({
    data: {
      leadId: params.leadId ?? null,
      customerId: params.customerId ?? null,
      contactId: params.contactId ?? null,
      type: "QUOTE_REQUEST",
      title: params.title,
      content: params.content ?? null,
    },
  });
}

export async function listQuotes(params?: {
  search?: string;
  status?: QuoteStatus;
  leadId?: string;
  customerId?: string;
  limit?: number;
}) {
  const search = params?.search?.trim();
  const rows = await prisma.quote.findMany({
    where: {
      status: params?.status,
      leadId: params?.leadId,
      customerId: params?.customerId,
      ...(search
        ? {
            OR: [
              { quoteNo: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { lead: { fullName: { contains: search, mode: "insensitive" } } },
              { lead: { companyName: { contains: search, mode: "insensitive" } } },
              { lead: { phone: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { fullName: true, company: true, companyName: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: params?.limit ?? 100,
  });
  return { quotes: rows.map(mapListRow), total: rows.length };
}

export async function getQuoteDetail(id: string) {
  const row = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, fullName: true, code: true, phone: true, companyName: true, company: true } },
      customer: { select: { id: true, name: true, code: true, phone: true, email: true } },
      contact: { select: { id: true, fullName: true, phone: true, email: true } },
      priceGroup: { select: { id: true, name: true, code: true } },
      pricingCalculation: { select: { id: true, code: true } },
      order: { select: { id: true, orderNo: true } },
      items: { orderBy: { sortOrder: "asc" }, include: { designMediaAsset: { select: { url: true } } } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    quoteNo: row.quoteNo,
    publicToken: row.publicToken,
    publicShortCode: row.publicShortCode,
    sourceType: row.sourceType,
    pricingCalculationId: row.pricingCalculationId,
    leadId: row.leadId,
    customerId: row.customerId,
    contactId: row.contactId,
    priceGroupId: row.priceGroupId,
    status: row.status,
    title: row.title,
    validUntil: row.validUntil?.toISOString() ?? null,
    quoteDate: row.quoteDate?.toISOString() ?? null,
    currency: row.currency,
    priceVatType: row.priceVatType,
    customerCompanySnapshot: row.customerCompanySnapshot,
    customerTaxCodeSnapshot: row.customerTaxCodeSnapshot,
    customerAddressSnapshot: row.customerAddressSnapshot,
    customerContactNameSnapshot: row.customerContactNameSnapshot,
    customerContactTitleSnapshot: row.customerContactTitleSnapshot,
    customerPhoneSnapshot: row.customerPhoneSnapshot,
    customerEmailSnapshot: row.customerEmailSnapshot,
    salesRepresentativeId: row.salesRepresentativeId,
    salesName: row.salesName,
    salesTitleSnapshot: row.salesTitleSnapshot,
    salesPhone: row.salesPhone,
    salesEmail: row.salesEmail,
    salesAddress: row.salesAddress,
    preparedBy: row.preparedBy,
    sentAt: row.sentAt?.toISOString() ?? null,
    viewedAt: row.viewedAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    subtotal: row.subtotal.toNumber(),
    serviceTotal: row.serviceTotal.toNumber(),
    setupTotal: row.setupTotal.toNumber(),
    discountAmount: row.discountAmount.toNumber(),
    shippingFee: row.shippingFee.toNumber(),
    vatRate: row.vatRate.toNumber(),
    vatAmount: row.vatAmount.toNumber(),
    totalAmount: row.totalAmount.toNumber(),
    manualOverride: row.manualOverride,
    manualTotalAmount: decimalToNum(row.manualTotalAmount),
    manualOverrideReason: row.manualOverrideReason,
    customerNote: row.customerNote,
    internalNote: row.internalNote,
    terms: row.terms,
    sampleFee: decimalToNum(row.sampleFee),
    sampleLeadTime: row.sampleLeadTime,
    sampleRefundCondition: row.sampleRefundCondition,
    inputSnapshot: row.inputSnapshot,
    resultSnapshot: row.resultSnapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lead: row.lead,
    customer: row.customer,
    contact: row.contact,
    priceGroup: row.priceGroup,
    pricingCalculation: row.pricingCalculation,
    order: row.order,
    items: row.items.map((item) => ({
      id: item.id,
      pricingCalculationItemId: item.pricingCalculationItemId,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      description: item.description,
      designMediaAssetId: item.designMediaAssetId,
      designImageUrl: item.designImageUrl,
      designMediaAsset: item.designMediaAsset,
      skuSnapshot: item.skuSnapshot,
      colorSnapshot: item.colorSnapshot,
      categorySnapshot: item.categorySnapshot,
      genderSnapshot: item.genderSnapshot,
      moqSnapshot: item.moqSnapshot,
      itemNote: item.itemNote,
      productionLeadTime: item.productionLeadTime,
      sampleFee: decimalToNum(item.sampleFee),
      sampleLeadTime: item.sampleLeadTime,
      quantity: item.quantity,
      unit: item.unit,
      baseUnitPrice: item.baseUnitPrice.toNumber(),
      serviceFee: item.serviceFee.toNumber(),
      setupFee: item.setupFee.toNumber(),
      unitPrice: item.unitPrice.toNumber(),
      discountAmount: item.discountAmount.toNumber(),
      lineSubtotal: item.lineSubtotal.toNumber(),
      lineTotal: item.lineTotal.toNumber(),
      costEstimate: decimalToNum(item.costEstimate),
      marginAmount: decimalToNum(item.marginAmount),
      marginRate: decimalToNum(item.marginRate),
      pricingSnapshot: item.pricingSnapshot,
      manualOverride: item.manualOverride,
      manualUnitPrice: decimalToNum(item.manualUnitPrice),
      manualOverrideReason: item.manualOverrideReason,
      sortOrder: item.sortOrder,
    })),
  };
}

export async function createQuote(input: CreateQuoteInput) {
  validateQuoteItems(input.items);
  if ((input.vatRate ?? 0) < 0) throw new QuoteValidationError("VAT phải >= 0.");
  await validateQuoteCustomerContact(input.customerId, input.contactId);

  const { items, totals } = computeQuoteFromItems(input.items, {
    discountAmount: input.discountAmount,
    shippingFee: input.shippingFee,
    vatRate: input.vatRate,
    manualTotalAmount: input.manualTotalAmount,
  });

  const quoteNo = await generateQuoteNo();
  const publicToken = generatePublicToken();
  const publicShortCode = await allocateQuotePublicShortCode();
  const terms = input.terms?.trim() || DEFAULT_QUOTE_TERMS;

  const quote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({
      data: {
        quoteNo,
        publicToken,
        publicShortCode,
        sourceType: input.sourceType ?? "MANUAL",
        pricingCalculationId: input.pricingCalculationId ?? null,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        contactId: input.contactId ?? null,
        priceGroupId: input.priceGroupId ?? null,
        status: input.status ?? "DRAFT",
        title: input.title?.trim() || "Báo giá sản phẩm ATTD",
        validUntil: input.validUntil ? new Date(input.validUntil) : defaultValidUntil(),
        quoteDate: input.quoteDate ? new Date(input.quoteDate) : new Date(),
        currency: input.currency ?? "VND",
        priceVatType: input.priceVatType ?? "EXCLUDING_VAT",
        customerCompanySnapshot: input.customerCompanySnapshot ?? null,
        customerTaxCodeSnapshot: input.customerTaxCodeSnapshot ?? null,
        customerAddressSnapshot: input.customerAddressSnapshot ?? null,
        customerContactNameSnapshot: input.customerContactNameSnapshot ?? null,
        customerContactTitleSnapshot: input.customerContactTitleSnapshot ?? null,
        customerPhoneSnapshot: input.customerPhoneSnapshot ?? null,
        customerEmailSnapshot: input.customerEmailSnapshot ?? null,
        salesRepresentativeId: input.salesRepresentativeId ?? null,
        salesName: input.salesName ?? null,
        salesTitleSnapshot: input.salesTitleSnapshot ?? null,
        salesPhone: input.salesPhone ?? null,
        salesEmail: input.salesEmail ?? null,
        salesAddress: input.salesAddress ?? null,
        preparedBy: input.preparedBy ?? null,
        subtotal: totals.subtotal,
        serviceTotal: totals.serviceTotal,
        setupTotal: totals.setupTotal,
        discountAmount: totals.discountAmount,
        shippingFee: totals.shippingFee,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        manualOverride: totals.manualOverride,
        manualTotalAmount: totals.manualTotalAmount,
        manualOverrideReason: input.manualOverrideReason ?? null,
        customerNote: input.customerNote ?? null,
        internalNote: input.internalNote ?? null,
        terms,
        sampleFee: input.sampleFee ?? null,
        sampleLeadTime: input.sampleLeadTime?.trim() || null,
        sampleRefundCondition: input.sampleRefundCondition?.trim() || null,
        inputSnapshot: input as unknown as Prisma.InputJsonValue,
        resultSnapshot: { items, totals } as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.quoteItem.createMany({ data: buildItemCreateData(created.id, items) });

    if (input.pricingCalculationId) {
      await tx.pricingCalculation.update({
        where: { id: input.pricingCalculationId },
        data: { status: "USED_FOR_QUOTE" },
      });
    }

    await logQuoteActivity(tx, {
      leadId: input.leadId,
      customerId: input.customerId,
      contactId: input.contactId,
      title: "Tạo báo giá mới",
      content: quoteNo,
    });

    return created;
  });

  return getQuoteDetail(quote.id);
}

export async function createQuoteFromPricingCalculation(
  pricingCalculationId: string,
  overrides?: Partial<CreateQuoteInput>
) {
  const calc = await getPricingCalculationDetail(pricingCalculationId);
  if (!calc) throw new QuoteValidationError("Không tìm thấy bản tính giá.");

  const items: QuoteItemInput[] = calc.items.map((item, index) => ({
    pricingCalculationItemId: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variantNameSnapshot,
    quantity: item.quantity,
    unit: item.unit,
    baseUnitPrice: item.baseUnitPrice,
    serviceFee: item.serviceFee,
    setupFee: item.setupFee,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    manualUnitPrice: item.manualUnitPrice,
    manualOverrideReason: item.manualOverrideReason,
    pricingSnapshot: item.pricingSnapshot as Record<string, unknown> | null,
    sortOrder: index,
  }));

  return createQuote({
    sourceType: "PRICING_CALCULATION",
    pricingCalculationId,
    leadId: overrides?.leadId ?? calc.lead?.id ?? null,
    customerId: overrides?.customerId ?? calc.customer?.id ?? null,
    contactId: overrides?.contactId ?? calc.contact?.id ?? null,
    priceGroupId: overrides?.priceGroupId ?? calc.priceGroup?.id ?? null,
    title: overrides?.title ?? "Báo giá sản phẩm ATTD",
    validUntil: overrides?.validUntil ?? defaultValidUntil().toISOString(),
    discountAmount: overrides?.discountAmount ?? calc.discountAmount,
    shippingFee: overrides?.shippingFee ?? calc.shippingFee,
    vatRate: overrides?.vatRate ?? calc.vatRate,
    manualTotalAmount: overrides?.manualTotalAmount ?? calc.manualTotalAmount,
    manualOverrideReason: overrides?.manualOverrideReason ?? calc.manualOverrideReason,
    customerNote: overrides?.customerNote ?? null,
    internalNote: overrides?.internalNote ?? calc.internalNote,
    terms: overrides?.terms,
    status: overrides?.status ?? "DRAFT",
    items: overrides?.items ?? items,
  });
}

export async function updateQuote(id: string, input: Partial<CreateQuoteInput>) {
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) throw new QuoteValidationError("Không tìm thấy báo giá.");
  if (!input.items?.length) throw new QuoteValidationError("Cần ít nhất một dòng sản phẩm/dịch vụ.");
  validateQuoteItems(input.items);
  const customerId = input.customerId !== undefined ? input.customerId : existing.customerId;
  const contactId = input.contactId !== undefined ? input.contactId : existing.contactId;
  await validateQuoteCustomerContact(customerId, contactId);

  const { items, totals } = computeQuoteFromItems(input.items, {
    discountAmount: input.discountAmount ?? existing.discountAmount.toNumber(),
    shippingFee: input.shippingFee ?? existing.shippingFee.toNumber(),
    vatRate: input.vatRate ?? existing.vatRate.toNumber(),
    manualTotalAmount:
      input.manualTotalAmount !== undefined
        ? input.manualTotalAmount
        : decimalToNum(existing.manualTotalAmount),
  });

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        leadId: input.leadId !== undefined ? input.leadId : undefined,
        customerId: input.customerId !== undefined ? input.customerId : undefined,
        contactId: input.contactId !== undefined ? input.contactId : undefined,
        priceGroupId: input.priceGroupId !== undefined ? input.priceGroupId : undefined,
        title: input.title !== undefined ? (input.title?.trim() || "Báo giá sản phẩm ATTD") : undefined,
        validUntil: input.validUntil !== undefined ? (input.validUntil ? new Date(input.validUntil) : null) : undefined,
        quoteDate: input.quoteDate !== undefined ? (input.quoteDate ? new Date(input.quoteDate) : null) : undefined,
        currency: input.currency !== undefined ? input.currency : undefined,
        priceVatType: input.priceVatType !== undefined ? input.priceVatType : undefined,
        customerCompanySnapshot: input.customerCompanySnapshot !== undefined ? input.customerCompanySnapshot : undefined,
        customerTaxCodeSnapshot: input.customerTaxCodeSnapshot !== undefined ? input.customerTaxCodeSnapshot : undefined,
        customerAddressSnapshot: input.customerAddressSnapshot !== undefined ? input.customerAddressSnapshot : undefined,
        customerContactNameSnapshot: input.customerContactNameSnapshot !== undefined ? input.customerContactNameSnapshot : undefined,
        customerContactTitleSnapshot: input.customerContactTitleSnapshot !== undefined ? input.customerContactTitleSnapshot : undefined,
        customerPhoneSnapshot: input.customerPhoneSnapshot !== undefined ? input.customerPhoneSnapshot : undefined,
        customerEmailSnapshot: input.customerEmailSnapshot !== undefined ? input.customerEmailSnapshot : undefined,
        salesRepresentativeId:
          input.salesRepresentativeId !== undefined ? input.salesRepresentativeId : undefined,
        salesName: input.salesName !== undefined ? input.salesName : undefined,
        salesTitleSnapshot:
          input.salesTitleSnapshot !== undefined ? input.salesTitleSnapshot : undefined,
        salesPhone: input.salesPhone !== undefined ? input.salesPhone : undefined,
        salesEmail: input.salesEmail !== undefined ? input.salesEmail : undefined,
        salesAddress: input.salesAddress !== undefined ? input.salesAddress : undefined,
        preparedBy: input.preparedBy !== undefined ? input.preparedBy : undefined,
        subtotal: totals.subtotal,
        serviceTotal: totals.serviceTotal,
        setupTotal: totals.setupTotal,
        discountAmount: totals.discountAmount,
        shippingFee: totals.shippingFee,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        manualOverride: totals.manualOverride,
        manualTotalAmount: totals.manualTotalAmount,
        manualOverrideReason: input.manualOverrideReason !== undefined ? input.manualOverrideReason : undefined,
        customerNote: input.customerNote !== undefined ? input.customerNote : undefined,
        internalNote: input.internalNote !== undefined ? input.internalNote : undefined,
        terms: input.terms !== undefined ? (input.terms?.trim() || DEFAULT_QUOTE_TERMS) : undefined,
        sampleFee: input.sampleFee !== undefined ? input.sampleFee : undefined,
        sampleLeadTime:
          input.sampleLeadTime !== undefined
            ? input.sampleLeadTime?.trim() || null
            : undefined,
        sampleRefundCondition:
          input.sampleRefundCondition !== undefined
            ? input.sampleRefundCondition?.trim() || null
            : undefined,
        inputSnapshot: input as unknown as Prisma.InputJsonValue,
        resultSnapshot: { items, totals } as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.quoteItem.createMany({ data: buildItemCreateData(id, items) });
  });

  return getQuoteDetail(id);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new QuoteValidationError("Không tìm thấy báo giá.");

  const now = new Date();
  let activityTitle = "";
  let leadStatus: LeadStatus | null = null;

  switch (status) {
    case "SENT":
      activityTitle = "Đã gửi báo giá";
      leadStatus = "QUOTED";
      break;
    case "ACCEPTED":
      activityTitle = "Khách đã đồng ý báo giá";
      leadStatus = "WON";
      break;
    case "REJECTED":
      activityTitle = "Khách đã từ chối báo giá";
      break;
    case "CANCELLED":
      activityTitle = "Đã hủy báo giá";
      break;
    default:
      break;
  }

  await prisma.$transaction(async (tx) => {
    let publicToken = quote.publicToken;
    if (!publicToken && (status === "SENT" || status === "VIEWED")) {
      publicToken = generatePublicToken();
    }

    await tx.quote.update({
      where: { id },
      data: {
        status,
        publicToken,
        sentAt: status === "SENT" && !quote.sentAt ? now : undefined,
        viewedAt: status === "VIEWED" && !quote.viewedAt ? now : undefined,
        acceptedAt: status === "ACCEPTED" && !quote.acceptedAt ? now : undefined,
        rejectedAt: status === "REJECTED" && !quote.rejectedAt ? now : undefined,
        cancelledAt: status === "CANCELLED" && !quote.cancelledAt ? now : undefined,
      },
    });

    if (activityTitle) {
      await logQuoteActivity(tx, {
        leadId: quote.leadId,
        customerId: quote.customerId,
        contactId: quote.contactId,
        title: activityTitle,
        content: quote.quoteNo,
      });
    }

    if (leadStatus && quote.leadId) {
      const lead = await tx.lead.findUnique({ where: { id: quote.leadId } });
      if (lead && !TERMINAL_LEAD_STATUSES.includes(lead.status)) {
        await tx.lead.update({ where: { id: quote.leadId }, data: { status: leadStatus } });
      }
    }
  });

  return getQuoteDetail(id);
}

export async function duplicateQuote(id: string) {
  const source = await getQuoteDetail(id);
  if (!source) throw new QuoteValidationError("Không tìm thấy báo giá.");

  return createQuote({
    sourceType: source.sourceType as QuoteSourceType,
    pricingCalculationId: source.pricingCalculationId,
    leadId: source.leadId,
    customerId: source.customerId,
    contactId: source.contactId,
    priceGroupId: source.priceGroupId,
    title: source.title ? `${source.title} (bản sao)` : "Báo giá sản phẩm ATTD (bản sao)",
    validUntil: defaultValidUntil().toISOString(),
    discountAmount: source.discountAmount,
    shippingFee: source.shippingFee,
    vatRate: source.vatRate,
    manualTotalAmount: source.manualTotalAmount,
    manualOverrideReason: source.manualOverrideReason,
    customerNote: source.customerNote,
    internalNote: source.internalNote,
    terms: source.terms,
    sampleFee: source.sampleFee,
    sampleLeadTime: source.sampleLeadTime,
    sampleRefundCondition: source.sampleRefundCondition,
    quoteDate: new Date().toISOString(),
    currency: source.currency,
    priceVatType: source.priceVatType,
    customerCompanySnapshot: source.customerCompanySnapshot,
    customerTaxCodeSnapshot: source.customerTaxCodeSnapshot,
    customerAddressSnapshot: source.customerAddressSnapshot,
    customerContactNameSnapshot: source.customerContactNameSnapshot,
    customerContactTitleSnapshot: source.customerContactTitleSnapshot,
    customerPhoneSnapshot: source.customerPhoneSnapshot,
    customerEmailSnapshot: source.customerEmailSnapshot,
    salesRepresentativeId: source.salesRepresentativeId,
    salesName: source.salesName,
    salesTitleSnapshot: source.salesTitleSnapshot,
    salesPhone: source.salesPhone,
    salesEmail: source.salesEmail,
    salesAddress: source.salesAddress,
    preparedBy: source.preparedBy,
    status: "DRAFT",
    items: source.items.map((item) => ({
      pricingCalculationItemId: item.pricingCalculationItemId,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      skuSnapshot: item.skuSnapshot,
      colorSnapshot: item.colorSnapshot,
      categorySnapshot: item.categorySnapshot,
      description: item.description,
      designMediaAssetId: item.designMediaAssetId,
      designImageUrl: item.designImageUrl,
      moqSnapshot: item.moqSnapshot,
      itemNote: item.itemNote,
      productionLeadTime: item.productionLeadTime,
      sampleFee: item.sampleFee,
      sampleLeadTime: item.sampleLeadTime,
      quantity: item.quantity,
      unit: item.unit,
      baseUnitPrice: item.baseUnitPrice,
      serviceFee: item.serviceFee,
      setupFee: item.setupFee,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      manualUnitPrice: item.manualUnitPrice,
      manualOverrideReason: item.manualOverrideReason,
      pricingSnapshot: item.pricingSnapshot as Record<string, unknown> | null,
      sortOrder: item.sortOrder,
    })),
  });
}

export async function getPublicQuoteByToken(token: string, markViewed = true) {
  const row = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      customer: { select: { code: true, name: true, legalName: true, taxCode: true, address: true, phone: true, email: true } },
      contact: { select: { fullName: true, title: true, phone: true, email: true } },
      lead: { select: { fullName: true, companyName: true, company: true, phone: true, email: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { designMediaAsset: { select: { url: true } } },
      },
    },
  });

  if (!row) return null;

  if (markViewed && row.status === "SENT") {
    await prisma.quote.update({
      where: { id: row.id },
      data: {
        status: "VIEWED",
        viewedAt: row.viewedAt ?? new Date(),
      },
    });
    row.status = "VIEWED";
    row.viewedAt = row.viewedAt ?? new Date();
  }

  return formatPublicQuoteDocument(row);
}

export async function getQuotePdfDataById(
  id: string,
  company?: Parameters<typeof formatQuotePdfData>[1]
) {
  const row = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { code: true, name: true, legalName: true, taxCode: true, address: true, phone: true, email: true } },
      contact: { select: { fullName: true, title: true, phone: true, email: true } },
      lead: { select: { fullName: true, companyName: true, company: true, phone: true, email: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { designMediaAsset: { select: { url: true } } },
      },
    },
  });
  if (!row) return null;
  return formatQuotePdfData(row, company);
}

export async function getQuotePdfDataByToken(
  token: string,
  company?: Parameters<typeof formatQuotePdfData>[1]
) {
  const row = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      customer: { select: { code: true, name: true, legalName: true, taxCode: true, address: true, phone: true, email: true } },
      contact: { select: { fullName: true, title: true, phone: true, email: true } },
      lead: { select: { fullName: true, companyName: true, company: true, phone: true, email: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { designMediaAsset: { select: { url: true } } },
      },
    },
  });
  if (!row) return null;
  return formatQuotePdfData(row, company);
}

export async function buildQuotePrefill(params: {
  pricingCalculationId?: string;
  leadId?: string;
  customerId?: string;
}) {
  const [companySettings, defaultSalesRep] = await Promise.all([
    getCompanySettings(),
    getDefaultSalesRepresentative(),
  ]);
  const salesRepSnapshots = defaultSalesRep ? salesRepToQuoteSnapshots(defaultSalesRep) : null;
  const salesDefaults = {
    salesPhone: salesRepSnapshots?.salesPhone ?? (companySettings.hotline.display?.trim() || null),
    salesEmail: salesRepSnapshots?.salesEmail ?? (companySettings.email?.trim() || null),
    salesAddress: salesRepSnapshots?.salesAddress ?? (companySettings.address?.trim() || null),
    salesName: salesRepSnapshots?.salesName ?? null,
    salesTitleSnapshot: salesRepSnapshots?.salesTitleSnapshot ?? null,
    salesRepresentativeId: salesRepSnapshots?.salesRepresentativeId ?? null,
  };

  const basePrefill = {
    quoteDate: new Date().toISOString(),
    currency: "VND" as const,
    priceVatType: "EXCLUDING_VAT" as const,
    title: "Báo giá sản phẩm ATTD",
    validUntil: defaultValidUntil().toISOString(),
    ...salesDefaults,
  };

  async function snapshotsFromCustomer(customerId: string, contactId?: string | null) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
    });
    if (!customer) return null;
    const contact =
      (contactId ? customer.contacts.find((c) => c.id === contactId) : null) ??
      customer.contacts.find((c) => c.isPrimary) ??
      customer.contacts[0];
    return {
      ...customerToQuoteSnapshots(customer),
      ...(contact
        ? contactToQuoteSnapshots(contact, {
            phone: customer.phone,
            email: customer.email,
          })
        : {}),
      customerId: customer.id,
      contactId: contact?.id ?? null,
    };
  }

  if (params.pricingCalculationId) {
    const calc = await getPricingCalculationDetail(params.pricingCalculationId);
    if (!calc) return null;
    const customerSnapshots =
      calc.customer?.id
        ? await snapshotsFromCustomer(calc.customer.id, calc.contact?.id)
        : null;
    return {
      ...basePrefill,
      sourceType: "PRICING_CALCULATION" as const,
      pricingCalculationId: calc.id,
      leadId: calc.lead?.id ?? null,
      customerId: calc.customer?.id ?? customerSnapshots?.customerId ?? null,
      contactId: calc.contact?.id ?? customerSnapshots?.contactId ?? null,
      priceGroupId: calc.priceGroup?.id ?? null,
      customerCompanySnapshot:
        customerSnapshots?.customerCompanySnapshot ??
        calc.contact?.fullName ??
        null,
      customerTaxCodeSnapshot: customerSnapshots?.customerTaxCodeSnapshot ?? null,
      customerAddressSnapshot: customerSnapshots?.customerAddressSnapshot ?? null,
      customerContactNameSnapshot:
        customerSnapshots?.customerContactNameSnapshot ??
        calc.contact?.fullName ??
        null,
      customerContactTitleSnapshot: customerSnapshots?.customerContactTitleSnapshot ?? null,
      customerPhoneSnapshot: customerSnapshots?.customerPhoneSnapshot ?? null,
      customerEmailSnapshot: customerSnapshots?.customerEmailSnapshot ?? null,
      discountAmount: calc.discountAmount,
      shippingFee: calc.shippingFee,
      vatRate: calc.vatRate,
      manualTotalAmount: calc.manualTotalAmount,
      manualOverrideReason: calc.manualOverrideReason,
      internalNote: calc.internalNote,
      items: calc.items.map((item, index) => ({
        pricingCalculationItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productNameSnapshot: item.productNameSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        skuSnapshot: item.variantNameSnapshot,
        quantity: item.quantity,
        unit: item.unit,
        baseUnitPrice: item.baseUnitPrice,
        serviceFee: item.serviceFee,
        setupFee: item.setupFee,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        manualUnitPrice: item.manualUnitPrice,
        manualOverrideReason: item.manualOverrideReason,
        pricingSnapshot: item.pricingSnapshot,
        sortOrder: index,
      })),
    };
  }

  if (params.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      include: {
        productInterests: { include: { product: { include: { category: true } }, variant: true } },
      },
    });
    if (!lead) return null;
    return {
      ...basePrefill,
      sourceType: "LEAD" as const,
      leadId: lead.id,
      customerId: lead.customerId,
      contactId: lead.contactId,
      customerCompanySnapshot: lead.companyName ?? lead.company ?? null,
      customerContactNameSnapshot: lead.fullName,
      customerPhoneSnapshot: lead.phone,
      customerEmailSnapshot: lead.email,
      items: lead.productInterests.map((pi, index) => ({
        productId: pi.productId,
        variantId: pi.variantId,
        productNameSnapshot: pi.productNameSnapshot ?? pi.product?.name ?? "Sản phẩm quan tâm",
        variantNameSnapshot: pi.variant?.colorName ?? pi.variant?.sku ?? null,
        skuSnapshot: pi.variant?.sku ?? null,
        colorSnapshot: pi.variant?.colorName ?? null,
        categorySnapshot: pi.product?.category?.name ?? null,
        moqSnapshot: pi.quantity ?? pi.product?.defaultMoq ?? null,
        quantity: pi.quantity ?? 100,
        unit: pi.unit ?? "cái",
        baseUnitPrice: 0,
        unitPrice: 0,
        sortOrder: index,
      })),
    };
  }

  if (params.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: params.customerId },
      include: { contacts: { where: { isPrimary: true }, take: 1 } },
    });
    if (!customer) return null;
    const primary = customer.contacts[0];
    const snapshots = {
      ...customerToQuoteSnapshots(customer),
      ...(primary
        ? contactToQuoteSnapshots(primary, {
            phone: customer.phone,
            email: customer.email,
          })
        : {}),
    };
    return {
      ...basePrefill,
      sourceType: "CUSTOMER" as const,
      customerId: customer.id,
      contactId: primary?.id ?? null,
      ...snapshots,
      items: [{ productNameSnapshot: "", quantity: 100, unit: "cái", baseUnitPrice: 0, unitPrice: 0, sortOrder: 0 }],
    };
  }

  return {
    ...basePrefill,
    sourceType: "MANUAL" as const,
    items: [{ productNameSnapshot: "", quantity: 100, unit: "cái", baseUnitPrice: 0, unitPrice: 0, sortOrder: 0 }],
  };
}
