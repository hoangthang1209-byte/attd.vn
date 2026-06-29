import type {
  DealerCompanyStatus,
  DealerCompanyType,
  DealerLevel,
  DealerUserRole,
  DealerUserStatus,
} from "@prisma/client";
import {
  DEALER_COMPANY_STATUSES,
  DEALER_COMPANY_TYPES,
  DEALER_LEVELS,
  DEALER_USER_ROLES,
  DEALER_USER_STATUSES,
} from "@/features/dealer/types";

export class DealerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealerValidationError";
  }
}

export function isValidDealerCompanyType(value: string): value is DealerCompanyType {
  return (DEALER_COMPANY_TYPES as readonly string[]).includes(value);
}

export function isValidDealerCompanyStatus(value: string): value is DealerCompanyStatus {
  return (DEALER_COMPANY_STATUSES as readonly string[]).includes(value);
}

export function isValidDealerLevel(value: string): value is DealerLevel {
  return (DEALER_LEVELS as readonly string[]).includes(value);
}

export function isValidDealerUserRole(value: string): value is DealerUserRole {
  return (DEALER_USER_ROLES as readonly string[]).includes(value);
}

export function isValidDealerUserStatus(value: string): value is DealerUserStatus {
  return (DEALER_USER_STATUSES as readonly string[]).includes(value);
}

export function normalizeDealerEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new DealerValidationError("Email không hợp lệ.");
  }
  return normalized;
}

export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
