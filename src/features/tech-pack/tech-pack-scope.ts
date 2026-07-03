import "server-only";

import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { getPermissionScope } from "@/features/auth/admin-permissions";

export function canManageTechPacks(session: AdminSessionUser): boolean {
  const scope = getPermissionScope(session, "production.update");
  return scope === "ALL" || scope === "TEAM";
}

export function canPublishTechPack(session: AdminSessionUser): boolean {
  return canManageTechPacks(session);
}

export function canManagePatterns(session: AdminSessionUser): boolean {
  return canManageTechPacks(session);
}

export function canApprovePatterns(session: AdminSessionUser): boolean {
  return canManageTechPacks(session);
}

export function canViewTechPackForJob(session: AdminSessionUser): boolean {
  const scope = getPermissionScope(session, "production.view");
  return scope !== "NONE";
}

export function techPackReadOnlyMessage(): string {
  return "Bạn chỉ có quyền xem Tech Pack cho công việc được phân công.";
}

export function techPackManageDeniedMessage(): string {
  return "Bạn không có quyền chỉnh sửa hoặc phát hành Tech Pack.";
}
