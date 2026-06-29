import { getB2BPortalSessionPayloadFromCookies } from "@/features/dealer/auth/dealer-session";
import { resolvePortalSessionFromPayload } from "@/features/dealer/auth/dealer-auth.service";
import { listDealerActivities } from "@/features/dealer/services/dealer-activity.service";
import type { DealerActivityRecord } from "@/features/dealer/types";
import type { DealerCompanyStatus, DealerLevel, DealerUserRole } from "@prisma/client";

export type DealerPortalContext =
  | { kind: "anonymous" }
  | {
      kind: "blocked";
      companyId: string;
      companyName: string;
      userName: string;
      companyStatus: Extract<DealerCompanyStatus, "REJECTED" | "SUSPENDED">;
    }
  | {
      kind: "pending";
      companyId: string;
      companyName: string;
      userId: string;
      userName: string;
      userEmail: string;
      role: DealerUserRole;
      companyLevel: DealerLevel;
      companyType: string;
    }
  | {
      kind: "approved";
      companyId: string;
      companyName: string;
      userId: string;
      userName: string;
      userEmail: string;
      role: DealerUserRole;
      companyLevel: DealerLevel;
      companyType: string;
      priceGroupId: string | null;
      priceGroupName: string | null;
      recentActivities: DealerActivityRecord[];
    };

export function canAccessPortalBusinessActions(ctx: DealerPortalContext): boolean {
  return ctx.kind === "approved";
}

export async function getDealerPortalContext(): Promise<DealerPortalContext> {
  const payload = await getB2BPortalSessionPayloadFromCookies();
  if (!payload) return { kind: "anonymous" };

  const session = await resolvePortalSessionFromPayload(payload);
  if (!session) return { kind: "anonymous" };

  if (session.companyStatus === "REJECTED" || session.companyStatus === "SUSPENDED") {
    return {
      kind: "blocked",
      companyId: session.dealerCompanyId,
      companyName: session.companyName,
      userName: session.userName,
      companyStatus: session.companyStatus,
    };
  }

  if (session.companyStatus !== "APPROVED") {
    return {
      kind: "pending",
      companyId: session.dealerCompanyId,
      companyName: session.companyName,
      userId: session.dealerUserId,
      userName: session.userName,
      userEmail: session.userEmail,
      role: session.role,
      companyLevel: session.companyLevel as DealerLevel,
      companyType: session.companyType,
    };
  }

  const { activities } = await listDealerActivities(session.dealerCompanyId, 8);

  return {
    kind: "approved",
    companyId: session.dealerCompanyId,
    companyName: session.companyName,
    userId: session.dealerUserId,
    userName: session.userName,
    userEmail: session.userEmail,
    role: session.role,
    companyLevel: session.companyLevel as DealerLevel,
    companyType: session.companyType,
    priceGroupId: session.priceGroupId,
    priceGroupName: session.priceGroupName,
    recentActivities: activities,
  };
}
