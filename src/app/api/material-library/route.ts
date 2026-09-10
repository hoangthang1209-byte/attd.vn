import { NextRequest, NextResponse } from "next/server";
import { listMaterialLibrary } from "@/features/production-master/material-library.service";
import type { MaterialLibraryKind } from "@/features/production-master/material-library";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

function parseKind(value: string | null): MaterialLibraryKind | "all" {
  if (value === "material" || value === "trim") return value;
  return "all";
}

function parseStatus(value: string | null): "all" | "active" | "inactive" {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

function parsePriceStatus(value: string | null): "all" | "has_price" | "no_price" {
  if (value === "has_price" || value === "no_price") return value;
  return "all";
}

function parseSort(value: string | null): "updated" | "name" | "code" {
  if (value === "name" || value === "code") return value;
  return "updated";
}

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const result = await listMaterialLibrary({
      search: searchParams.get("search") ?? undefined,
      kind: parseKind(searchParams.get("kind")),
      status: parseStatus(searchParams.get("status")),
      category: searchParams.get("category") ?? undefined,
      priceStatus: parsePriceStatus(searchParams.get("priceStatus")),
      sort: parseSort(searchParams.get("sort")),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Không thể tải thư viện nguyên phụ liệu." }, { status: 500 });
  }
}
