export const PERMISSION_ACTIONS = [
  "none",
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "admin",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ADMIN_PLATFORM_KEYS = [
  "dashboard",
  "crm",
  "commercial",
  "product",
  "dealer",
  "manufacturing",
  "tech-pack",
  "content",
  "business-intelligence",
  "operations",
  "ai",
  "growth",
] as const;

export type AdminPlatformKey = (typeof ADMIN_PLATFORM_KEYS)[number];

export type PlatformPermissionKey = `${AdminPlatformKey}.${PermissionAction}`;

export const PUBLIC_TOKEN_FORBIDDEN_FIELDS = [
  "internalNote",
  "internalNotes",
  "costPrice",
  "costEstimate",
  "marginAmount",
  "marginRate",
  "manualOverrideReason",
  "pricingSnapshot",
  "inputSnapshot",
  "resultSnapshot",
  "metadata",
  "assignedToAdminUserId",
  "staffOnlyIdentifiers",
  "privateCustomerDetails",
] as const;

export type PublicTokenForbiddenField =
  (typeof PUBLIC_TOKEN_FORBIDDEN_FIELDS)[number];
