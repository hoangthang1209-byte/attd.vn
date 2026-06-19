export type SalesRepresentativeRecord = {
  id: string;
  code: string;
  fullName: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  address: string | null;
  avatarMediaAssetId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSalesRepresentativeInput = {
  fullName: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  address?: string | null;
  avatarMediaAssetId?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  note?: string | null;
};

export type UpdateSalesRepresentativeInput = Partial<CreateSalesRepresentativeInput>;
