export type TechPackSourceItem = {
  type: "order-item" | "quote-item";
  id: string;
  code: string;
  parentCode: string;
  customerName: string | null;
  productName: string | null;
  sku: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  deadline: string | null;
  hasTechPack: boolean;
  latestTechPackId: string | null;
  latestTechPackVersion: number | null;
};

export type TechPackItemLink = {
  latestTechPackId: string;
  latestTechPackVersion: number;
  latestTechPackCode: string;
};
