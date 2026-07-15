import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledPosts } from "@/features/content/services/content-publishing.service";

/**
 * Durable due-publish processor.
 * Auth: Authorization: Bearer <CONTENT_PUBLISH_CRON_SECRET> or x-cron-secret header.
 * No admin session. Idempotent batch.
 * Vercel Hobby supports daily cron only; higher-frequency cron requires Pro.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_PUBLISH_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        message:
          "CONTENT_PUBLISH_CRON_SECRET (hoặc CRON_SECRET) chưa cấu hình — due processor inactive trên host này.",
      },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const summary = await processDueScheduledPosts();
  return NextResponse.json({
    ...summary,
    message: "Due processor completed.",
    timezoneNote: "Timestamps so sánh UTC; UI hiển thị Asia/Ho_Chi_Minh.",
  });
}

export async function GET(req: NextRequest) {
  // Allow Vercel Cron GET with same secret
  return POST(req);
}
