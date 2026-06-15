export type BusinessGoal =
  | "seo-traffic"
  | "oem-leads"
  | "dealer-recruitment"
  | "corporate-uniform"
  | "corporate-gift";

export type BusinessGoalConfig = {
  id: BusinessGoal;
  label: string;
  searchIntent: string;
  audiences: {
    b2bDealer: boolean;
    oem: boolean;
    corporateUniform: boolean;
    corporateGift: boolean;
  };
};

export const BUSINESS_GOAL_OPTIONS: BusinessGoalConfig[] = [
  {
    id: "seo-traffic",
    label: "Thu hút traffic SEO",
    searchIntent: "informational + commercial B2B",
    audiences: { b2bDealer: true, oem: false, corporateUniform: false, corporateGift: false },
  },
  {
    id: "oem-leads",
    label: "Tìm khách OEM",
    searchIntent: "commercial OEM sourcing",
    audiences: { b2bDealer: false, oem: true, corporateUniform: false, corporateGift: false },
  },
  {
    id: "dealer-recruitment",
    label: "Tuyển đại lý",
    searchIntent: "commercial dealer recruitment",
    audiences: { b2bDealer: true, oem: false, corporateUniform: false, corporateGift: false },
  },
  {
    id: "corporate-uniform",
    label: "Đồng phục doanh nghiệp",
    searchIntent: "commercial corporate uniform",
    audiences: { b2bDealer: false, oem: false, corporateUniform: true, corporateGift: false },
  },
  {
    id: "corporate-gift",
    label: "Quà tặng doanh nghiệp",
    searchIntent: "commercial corporate gift",
    audiences: { b2bDealer: false, oem: false, corporateUniform: false, corporateGift: true },
  },
];

export function getBusinessGoalConfig(goal: BusinessGoal): BusinessGoalConfig {
  return BUSINESS_GOAL_OPTIONS.find((g) => g.id === goal) ?? BUSINESS_GOAL_OPTIONS[0];
}
