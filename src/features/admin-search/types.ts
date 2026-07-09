export type AdminSearchEntityType =
  | "OPPORTUNITY"
  | "LEAD"
  | "CUSTOMER"
  | "CONTACT"
  | "QUOTE"
  | "PRICING"
  | "ORDER"
  | "PRODUCT"
  | "VARIANT"
  | "TECH_PACK";

export type AdminSearchResult = {
  id: string;
  type: AdminSearchEntityType;
  label: string;
  code?: string | null;
  subtitle?: string | null;
  status?: string | null;
  amount?: number | null;
  href: string;
  updatedAt?: string | null;
};

export type AdminSearchResponse = {
  query: string;
  results: AdminSearchResult[];
  grouped: Record<AdminSearchEntityType, AdminSearchResult[]>;
};
