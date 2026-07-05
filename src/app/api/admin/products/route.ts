import { NextRequest, NextResponse } from "next/server";
import {
  listProductsAdmin,
  createProductAdmin,
  getProductAdminKpis,
} from "@/features/products/product-admin.service";
import {
  formatProductAdminApiError,
  parseProductInput,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function logProductAdminError(action: "create" | "update", err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "unknown";
  console.error(`[POST /api/admin/products] action=${action} code=${code} message=${message}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const [list, kpis] = await Promise.all([
      listProductsAdmin({
        search: sp.get("search") ?? undefined,
        categoryId: sp.get("categoryId") ?? undefined,
        status: sp.get("status") ?? undefined,
        stockStatus: sp.get("stockStatus") ?? undefined,
        supportsPrinting: sp.get("supportsPrinting") === "1",
        supportsOem: sp.get("supportsOem") === "1",
        page: sp.has("page") ? Number(sp.get("page")) : 1,
        pageSize: sp.has("pageSize") ? Number(sp.get("pageSize")) : 40,
      }),
      getProductAdminKpis(),
    ]);
    return NextResponse.json({ ...list, kpis });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ message: "Lỗi tải sản phẩm." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON", message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const input = parseProductInput(body as Record<string, unknown>, "create");
    const product = await createProductAdmin(input);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    logProductAdminError("create", err);
    if (err instanceof ProductAdminValidationError) {
      const formatted = formatProductAdminApiError(err);
      return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
    }
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}
