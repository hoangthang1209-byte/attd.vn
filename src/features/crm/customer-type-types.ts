export type CustomerTypeRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
};
