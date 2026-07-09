import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminSearchEntityType,
  AdminSearchResponse,
  AdminSearchResult,
} from "@/features/admin-search/types";

const ENTITY_LIMIT = 8;
const TOTAL_LIMIT = 60;

const ENTITY_ORDER: AdminSearchEntityType[] = [
  "OPPORTUNITY",
  "LEAD",
  "CUSTOMER",
  "CONTACT",
  "QUOTE",
  "PRICING",
  "ORDER",
  "PRODUCT",
  "VARIANT",
  "TECH_PACK",
];

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function createEmptyGrouped(): Record<AdminSearchEntityType, AdminSearchResult[]> {
  return {
    OPPORTUNITY: [],
    LEAD: [],
    CUSTOMER: [],
    CONTACT: [],
    QUOTE: [],
    PRICING: [],
    ORDER: [],
    PRODUCT: [],
    VARIANT: [],
    TECH_PACK: [],
  };
}

function scoreResult(item: AdminSearchResult, query: string): number {
  const q = query.toLowerCase();
  const code = (item.code ?? "").toLowerCase();
  const label = item.label.toLowerCase();
  const subtitle = (item.subtitle ?? "").toLowerCase();

  if (code !== "" && code === q) return 400;
  if (code.startsWith(q)) return 300;
  if (label.includes(q)) return 200;
  if (subtitle.includes(q)) return 100;
  return 0;
}

function sortByRanking(results: AdminSearchResult[], query: string): AdminSearchResult[] {
  return [...results].sort((a, b) => {
    const scoreDiff = scoreResult(b, query) - scoreResult(a, query);
    if (scoreDiff !== 0) return scoreDiff;
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function normalizeQuery(query: string): string {
  return query.trim();
}

export async function runAdminSearch(rawQuery: string): Promise<AdminSearchResponse> {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) {
    return {
      query,
      results: [],
      grouped: createEmptyGrouped(),
    };
  }

  const contains = query;

  const [
    opportunities,
    leads,
    customers,
    contacts,
    quotes,
    pricings,
    orders,
    products,
    variants,
    techPacks,
  ] = await Promise.all([
    prisma.salesOpportunity.findMany({
      where: {
        OR: [
          { code: { contains, mode: "insensitive" } },
          { title: { contains, mode: "insensitive" } },
          { assignedTo: { contains, mode: "insensitive" } },
          { source: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        title: true,
        stage: true,
        estimatedValue: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { code: { contains, mode: "insensitive" } },
          { fullName: { contains, mode: "insensitive" } },
          { companyName: { contains, mode: "insensitive" } },
          { company: { contains, mode: "insensitive" } },
          { phone: { contains, mode: "insensitive" } },
          { email: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        companyName: true,
        company: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { code: { contains, mode: "insensitive" } },
          { name: { contains, mode: "insensitive" } },
          { legalName: { contains, mode: "insensitive" } },
          { phone: { contains, mode: "insensitive" } },
          { email: { contains, mode: "insensitive" } },
          { taxCode: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { fullName: { contains, mode: "insensitive" } },
          { phone: { contains, mode: "insensitive" } },
          { email: { contains, mode: "insensitive" } },
          { title: { contains, mode: "insensitive" } },
          { customer: { name: { contains, mode: "insensitive" } } },
          { customer: { code: { contains, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        title: true,
        phone: true,
        email: true,
        customerId: true,
        customer: { select: { id: true, code: true, name: true } },
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.quote.findMany({
      where: {
        OR: [
          { quoteNo: { contains, mode: "insensitive" } },
          { title: { contains, mode: "insensitive" } },
          { customerCompanySnapshot: { contains, mode: "insensitive" } },
          { customerContactNameSnapshot: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        quoteNo: true,
        status: true,
        totalAmount: true,
        customerCompanySnapshot: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pricingCalculation.findMany({
      where: {
        OR: [
          { code: { contains, mode: "insensitive" } },
          { customer: { name: { contains, mode: "insensitive" } } },
          { lead: { fullName: { contains, mode: "insensitive" } } },
          { lead: { companyName: { contains, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        code: true,
        status: true,
        totalAmount: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { orderNo: { contains, mode: "insensitive" } },
          { customerNameSnapshot: { contains, mode: "insensitive" } },
          { customerCompanyName: { contains, mode: "insensitive" } },
          { contactName: { contains, mode: "insensitive" } },
          { customerPhoneSnapshot: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalAmount: true,
        customerNameSnapshot: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { productCode: { contains, mode: "insensitive" } },
          { name: { contains, mode: "insensitive" } },
          { slug: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        productCode: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: {
        OR: [
          { sku: { contains, mode: "insensitive" } },
          { colorName: { contains, mode: "insensitive" } },
          { sizeName: { contains, mode: "insensitive" } },
          { product: { name: { contains, mode: "insensitive" } } },
          { product: { productCode: { contains, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        sku: true,
        colorName: true,
        sizeName: true,
        productId: true,
        product: { select: { name: true, productCode: true } },
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.techPack.findMany({
      where: {
        OR: [
          { code: { contains, mode: "insensitive" } },
          { title: { contains, mode: "insensitive" } },
          { customerNameSnapshot: { contains, mode: "insensitive" } },
          { productNameSnapshot: { contains, mode: "insensitive" } },
          { productSkuSnapshot: { contains, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        productNameSnapshot: true,
        updatedAt: true,
      },
      take: ENTITY_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const grouped = createEmptyGrouped();

  grouped.OPPORTUNITY = opportunities.map((row) => ({
    id: row.id,
    type: "OPPORTUNITY",
    label: row.title,
    code: row.code,
    subtitle: row.stage,
    status: row.stage,
    amount: decimalToNumber(row.estimatedValue),
    href: `/admin/sales/opportunity/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.LEAD = leads.map((row) => ({
    id: row.id,
    type: "LEAD",
    label: row.fullName,
    code: row.code,
    subtitle: row.companyName ?? row.company ?? row.phone,
    status: row.status,
    href: `/admin/crm/leads/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.CUSTOMER = customers.map((row) => ({
    id: row.id,
    type: "CUSTOMER",
    label: row.name,
    code: row.code,
    subtitle: row.email ?? row.phone ?? null,
    status: row.status,
    href: `/admin/crm/customers/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.CONTACT = contacts.map((row) => ({
    id: row.id,
    type: "CONTACT",
    label: row.fullName,
    subtitle: `${row.customer?.code ?? ""}${row.customer ? " · " : ""}${row.customer?.name ?? ""}`.trim() || row.email || row.phone || null,
    status: row.title,
    href: row.customerId ? `/admin/crm/customers/${row.customerId}` : "/admin/crm/customers",
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.QUOTE = quotes.map((row) => ({
    id: row.id,
    type: "QUOTE",
    label: row.quoteNo,
    code: row.quoteNo,
    subtitle: row.customerCompanySnapshot,
    status: row.status,
    amount: row.totalAmount.toNumber(),
    href: `/admin/quotes/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.PRICING = pricings.map((row) => ({
    id: row.id,
    type: "PRICING",
    label: row.code,
    code: row.code,
    status: row.status,
    amount: row.totalAmount.toNumber(),
    href: `/admin/pricing/history/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.ORDER = orders.map((row) => ({
    id: row.id,
    type: "ORDER",
    label: row.orderNo,
    code: row.orderNo,
    subtitle: row.customerNameSnapshot,
    status: row.status,
    amount: row.totalAmount.toNumber(),
    href: `/admin/orders/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.PRODUCT = products.map((row) => ({
    id: row.id,
    type: "PRODUCT",
    label: row.name,
    code: row.productCode,
    href: `/admin/products/${row.id}/edit`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.VARIANT = variants.map((row) => ({
    id: row.id,
    type: "VARIANT",
    label: row.sku,
    code: row.sku,
    subtitle: [row.product.productCode, row.product.name, row.colorName, row.sizeName]
      .filter(Boolean)
      .join(" · "),
    href: `/admin/products/${row.productId}/edit`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  grouped.TECH_PACK = techPacks.map((row) => ({
    id: row.id,
    type: "TECH_PACK",
    label: row.title ?? row.code,
    code: row.code,
    subtitle: row.productNameSnapshot,
    status: row.status,
    href: `/admin/tech-pack/${row.id}`,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const merged = ENTITY_ORDER.flatMap((type) => grouped[type]);
  const ranked = sortByRanking(merged, query).slice(0, TOTAL_LIMIT);

  const regrouped = createEmptyGrouped();
  ranked.forEach((item) => {
    regrouped[item.type].push(item);
  });

  return {
    query,
    results: ranked,
    grouped: regrouped,
  };
}
