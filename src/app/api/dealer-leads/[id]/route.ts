import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const VALID_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is ValidStatus {
  return VALID_STATUSES.includes(value as ValidStatus);
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "Request body missing." },
      { status: 400 }
    );
  }

  const { status } = body as Record<string, unknown>;

  if (!isValidStatus(status)) {
    return NextResponse.json(
      {
        success: false,
        message: `Status không hợp lệ. Các giá trị hợp lệ: ${VALID_STATUSES.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.dealerLead.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ success: true, lead: updated });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bản ghi." },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/dealer-leads/[id]] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}
