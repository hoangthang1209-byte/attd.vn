import { NextRequest, NextResponse } from "next/server";
import {
  ColorValidationError,
  createColor,
  listColors,
  updateColor,
} from "@/features/colors/color.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listColors({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("active") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/colors]", err);
    return NextResponse.json({ message: "Không thể tải danh sách màu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  try {
    const color = await createColor({
      name: typeof raw.name === "string" ? raw.name : "",
      hex: typeof raw.hex === "string" ? raw.hex : null,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : 0,
    });
    return NextResponse.json({ color }, { status: 201 });
  } catch (err) {
    if (err instanceof ColorValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/colors]", err);
    return NextResponse.json({ message: "Không thể tạo màu" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) {
    return NextResponse.json({ message: "Thiếu id màu" }, { status: 400 });
  }
  try {
    const color = await updateColor(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      hex: typeof raw.hex === "string" ? raw.hex : raw.hex === null ? null : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : undefined,
    });
    return NextResponse.json({ color });
  } catch (err) {
    if (err instanceof ColorValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/colors]", err);
    return NextResponse.json({ message: "Không thể cập nhật màu" }, { status: 500 });
  }
}
