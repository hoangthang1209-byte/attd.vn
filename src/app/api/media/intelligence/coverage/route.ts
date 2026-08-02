import { NextResponse } from "next/server";
import {
  assessBundleSlotCoverage,
  suggestBundleSlotsForAssets,
} from "@/features/media/intelligence/bundle-coverage.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const url = new URL(request.url);
  const bundleId = url.searchParams.get("bundleId");
  if (!bundleId) {
    return NextResponse.json({ message: "Thiếu bundleId" }, { status: 400 });
  }
  const report = await assessBundleSlotCoverage(bundleId);
  if (!report) {
    return NextResponse.json({ message: "Không tìm thấy bundle" }, { status: 404 });
  }
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const ids = (body as { mediaAssetIds?: unknown })?.mediaAssetIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ message: "mediaAssetIds không hợp lệ" }, { status: 400 });
  }
  const suggestions = await suggestBundleSlotsForAssets(ids.slice(0, 50));
  return NextResponse.json({ suggestions });
}
