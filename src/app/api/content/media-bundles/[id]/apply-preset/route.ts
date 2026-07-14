import { NextRequest, NextResponse } from "next/server";
import { applyPresetToBundle } from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_MODES = ["replace-empty", "add-missing"] as const;
type Mode = (typeof VALID_MODES)[number];

function validateMode(value: unknown): Mode | null {
  if (typeof value !== "string") return null;
  return VALID_MODES.includes(value as Mode) ? (value as Mode) : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  let mode: Mode = "add-missing";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (body && body.mode !== undefined) {
      const validated = validateMode(body.mode);
      if (!validated) {
        return NextResponse.json({ message: "Chế độ áp dụng mẫu không hợp lệ" }, { status: 400 });
      }
      mode = validated;
    }
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const bundle = await applyPresetToBundle(id, { mode });
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể áp dụng mẫu vị trí";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
