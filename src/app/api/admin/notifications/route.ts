import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationCenter,
  getOpportunityRelatedNotifications,
} from "@/features/notifications/notification-center.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunityId");

  try {
    if (opportunityId) {
      const notifications = await getOpportunityRelatedNotifications(opportunityId, 5);
      return NextResponse.json({
        notifications,
        stats: {
          total: notifications.length,
          urgent: notifications.filter((item) => item.severity === "URGENT").length,
          high: notifications.filter((item) => item.severity === "HIGH").length,
          normal: notifications.filter((item) => item.severity === "NORMAL").length,
          low: notifications.filter((item) => item.severity === "LOW").length,
        },
      });
    }

    const response = await getNotificationCenter();
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/admin/notifications]", error);
    return NextResponse.json(
      { message: "Không thể tải trung tâm thông báo" },
      { status: 500 },
    );
  }
}
