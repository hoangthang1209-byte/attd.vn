import "server-only";

import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";
import { prisma } from "@/lib/prisma";
import { matchesProductionJobAssignment } from "@/features/production-planning/production-plan-scope";
import type { TechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";

export async function assertTechPackPdfAccess(
  session: AdminSessionUser,
  pack: TechPackDetail,
): Promise<void> {
  const scope = getPermissionScope(session, "production.view");
  if (scope === "NONE") {
    throw new TechPackValidationError("Bạn không có quyền xem tài liệu này.");
  }
  if (scope === "ALL" || scope === "TEAM") return;

  if (!pack.orderItemId) {
    if (scope === "ASSIGNED") {
      throw new TechPackValidationError("Bạn không có quyền xem tài liệu này.");
    }
    return;
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: pack.orderItemId },
    select: {
      order: {
        select: {
          productionOwnerId: true,
          salesEmployeeId: true,
        },
      },
      productionPlan: { select: { productionOwnerId: true } },
    },
  });

  if (!item) {
    throw new TechPackValidationError("Không tìm thấy hạng mục sản xuất.");
  }

  const allowed = matchesProductionJobAssignment({
    session,
    orderProductionOwnerId: item.order.productionOwnerId,
    planProductionOwnerId: item.productionPlan?.productionOwnerId ?? null,
    salesEmployeeId: item.order.salesEmployeeId,
  });

  if (!allowed) {
    throw new TechPackValidationError("Bạn không có quyền xem tài liệu này.");
  }
}
