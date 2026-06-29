import { NextRequest, NextResponse } from "next/server";
import type {
  DealerCompanyStatus,
  DealerCompanyType,
  DealerLevel,
} from "@prisma/client";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import {
  dealerApiError,
  parseOptionalString,
} from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerCompanyStatus,
  isValidDealerCompanyType,
  isValidDealerLevel,
} from "@/features/dealer/dealer-validation";
import {
  createDealerCompany,
  listDealerCompanies,
} from "@/features/dealer/services/dealer-company.service";

export async function GET(req: NextRequest) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type");
  const levelParam = searchParams.get("level");

  if (statusParam && !isValidDealerCompanyStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
  }
  if (typeParam && !isValidDealerCompanyType(typeParam)) {
    return NextResponse.json({ message: "Loại đại lý không hợp lệ." }, { status: 400 });
  }
  if (levelParam && !isValidDealerLevel(levelParam)) {
    return NextResponse.json({ message: "Cấp đại lý không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await listDealerCompanies({
      search: searchParams.get("search") ?? undefined,
      status: statusParam as DealerCompanyStatus | undefined,
      type: typeParam as DealerCompanyType | undefined,
      level: levelParam as DealerLevel | undefined,
      limit: Number(searchParams.get("limit") ?? undefined) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return dealerApiError(err, "Không thể tải danh sách đại lý.");
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu yêu cầu." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    return NextResponse.json({ message: "Tên công ty là bắt buộc." }, { status: 400 });
  }

  const type =
    typeof raw.type === "string" && isValidDealerCompanyType(raw.type) ? raw.type : undefined;
  const level =
    typeof raw.level === "string" && isValidDealerLevel(raw.level) ? raw.level : undefined;

  try {
    const company = await createDealerCompany({
      name,
      legalName: parseOptionalString(raw.legalName),
      taxCode: parseOptionalString(raw.taxCode),
      email: parseOptionalString(raw.email),
      phone: parseOptionalString(raw.phone),
      website: parseOptionalString(raw.website),
      address: parseOptionalString(raw.address),
      city: parseOptionalString(raw.city),
      country: parseOptionalString(raw.country) ?? undefined,
      type,
      level,
      notes: parseOptionalString(raw.notes),
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return dealerApiError(err, "Không thể tạo đại lý.");
  }
}
