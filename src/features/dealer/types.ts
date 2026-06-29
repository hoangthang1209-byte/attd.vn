import type {
  DealerActivityType,
  DealerCompanyStatus,
  DealerCompanyType,
  DealerLevel,
  DealerUserRole,
  DealerUserStatus,
} from "@prisma/client";

export const DEALER_COMPANY_TYPES = [
  "DEALER",
  "AGENCY",
  "PRINTING_COMPANY",
  "EVENT_COMPANY",
  "CORPORATE_BUYER",
  "OEM_CLIENT",
  "OTHER",
] as const satisfies readonly DealerCompanyType[];

export const DEALER_COMPANY_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const satisfies readonly DealerCompanyStatus[];

export const DEALER_LEVELS = [
  "STANDARD",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
] as const satisfies readonly DealerLevel[];

export const DEALER_USER_ROLES = [
  "OWNER",
  "MANAGER",
  "SALES",
  "PURCHASING",
  "VIEWER",
] as const satisfies readonly DealerUserRole[];

export const DEALER_USER_STATUSES = [
  "INVITED",
  "ACTIVE",
  "DISABLED",
] as const satisfies readonly DealerUserStatus[];

export type DealerCompanyRecord = {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  taxCode: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string;
  type: DealerCompanyType;
  status: DealerCompanyStatus;
  level: DealerLevel;
  customerId: string | null;
  priceGroupId: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; code: string; name: string } | null;
  priceGroup?: { id: string; code: string; name: string } | null;
  userCount?: number;
};

export type DealerUserRecord = {
  id: string;
  dealerCompanyId: string;
  name: string;
  email: string;
  phone: string | null;
  role: DealerUserRole;
  status: DealerUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DealerActivityRecord = {
  id: string;
  dealerCompanyId: string;
  dealerUserId: string | null;
  type: DealerActivityType;
  title: string;
  description: string | null;
  metadata: unknown;
  createdAt: string;
};

export type CreateDealerCompanyInput = {
  name: string;
  legalName?: string | null;
  taxCode?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
  type?: DealerCompanyType;
  level?: DealerLevel;
  notes?: string | null;
};

export type UpdateDealerCompanyInput = Partial<CreateDealerCompanyInput> & {
  status?: DealerCompanyStatus;
  legalName?: string | null;
  taxCode?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
};

export type ApproveDealerCompanyInput = {
  approvedBy?: string | null;
  level?: DealerLevel;
  priceGroupId?: string | null;
};

export type CreateDealerUserInput = {
  name: string;
  email: string;
  phone?: string | null;
  role?: DealerUserRole;
  status?: DealerUserStatus;
};

export type UpdateDealerUserInput = Partial<CreateDealerUserInput>;

export type CreateDealerActivityInput = {
  dealerCompanyId: string;
  dealerUserId?: string | null;
  type: DealerActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};
