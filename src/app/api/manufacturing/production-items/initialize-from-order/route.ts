import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ItemProductionStageKey } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import { initializeFromOrder } from "@/features/item-production-tracking/item-production.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

export async function POST(req: NextRequest) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.create") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền khởi tạo theo dõi sản xuất" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      orderId?: string;
      defaultTemplateCode?: string;
      templateIdByOrderItemId?: Record<string, string>;
      customStageKeysByOrderItemId?: Record<string, ItemProductionStageKey[]>;
    };
    if (!body.orderId) {
      return NextResponse.json({ message: "Thiếu orderId" }, { status: 400 });
    }
    const result = await initializeFromOrder({
      orderId: body.orderId,
      defaultTemplateCode: body.defaultTemplateCode,
      templateIdByOrderItemId: body.templateIdByOrderItemId,
      customStageKeysByOrderItemId: body.customStageKeysByOrderItemId,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ message: "Đã khởi tạo theo dõi sản xuất", ...result });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể khởi tạo" },
      { status: 400 },
    );
  }
}
