import { NextResponse } from "next/server";
import { getB2BPortalSessionPayloadFromCookies } from "@/features/dealer/auth/dealer-session";
import { resolvePortalSessionFromPayload } from "@/features/dealer/auth/dealer-auth.service";

export type ApprovedDealerPortalSession = {
  companyId: string;
  userId: string;
  companyName: string;
  userName: string;
  priceGroupId: string | null;
  priceGroupName: string | null;
};

export async function requireApprovedDealerPortalFromCookies(): Promise<
  { session: ApprovedDealerPortalSession } | { error: NextResponse }
> {
  const payload = await getB2BPortalSessionPayloadFromCookies();
  if (!payload) {
    return {
      error: NextResponse.json({ message: "Vui lòng đăng nhập cổng B2B." }, { status: 401 }),
    };
  }
  return resolveApprovedDealerSession(payload.dealerCompanyId, payload.dealerUserId);
}

async function resolveApprovedDealerSession(
  companyId: string,
  userId: string,
): Promise<{ session: ApprovedDealerPortalSession } | { error: NextResponse }> {
  const session = await resolvePortalSessionFromPayload({
    dealerCompanyId: companyId,
    dealerUserId: userId,
  });

  if (!session) {
    return {
      error: NextResponse.json({ message: "Phiên B2B không hợp lệ." }, { status: 401 }),
    };
  }

  if (session.companyStatus !== "APPROVED") {
    return {
      error: NextResponse.json(
        { message: "Tài khoản B2B chưa được duyệt. Vui lòng chờ ATTD xác nhận." },
        { status: 403 },
      ),
    };
  }

  return {
    session: {
      companyId: session.dealerCompanyId,
      userId: session.dealerUserId,
      companyName: session.companyName,
      userName: session.userName,
      priceGroupId: session.priceGroupId,
      priceGroupName: session.priceGroupName,
    },
  };
}

export async function requireApprovedDealerPortal(
  companyId: string,
  userId: string,
): Promise<{ session: ApprovedDealerPortalSession } | { error: NextResponse }> {
  return resolveApprovedDealerSession(companyId, userId);
}
