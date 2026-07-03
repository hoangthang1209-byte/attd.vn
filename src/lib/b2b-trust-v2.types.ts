export type ProcessTrustStep = {
  label: string;
  description?: string;
};

export type EvidenceCategory =
  | "Kho hàng"
  | "Sản xuất"
  | "In / thêu"
  | "QC"
  | "Đóng gói"
  | "Giao hàng"
  | "Mẫu vật liệu"
  | "Đơn hàng thực tế";

export type EvidenceItem = {
  title: string;
  description?: string;
  category: EvidenceCategory;
  imageUrl?: string;
  alt?: string;
  href?: string;
};
