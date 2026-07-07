import type { CostingComponentType } from "@/features/pricing/costing-types";

export type CostingTemplateComponent = {
  label: string;
  type: CostingComponentType;
  unitCost?: number;
  totalCost?: number;
  quantityFactor?: number;
  note?: string;
};

export type CostingTemplate = {
  key: string;
  name: string;
  description: string;
  defaultUnit: string;
  defaultMaterialName: string;
  defaultFabricPrice: number;
  defaultFabricConsumption: number;
  defaultRibCostPerUnit: number;
  defaultOverheadRate: number;
  defaultTargetMarginRate: number;
  defaultVatRate: number;
  defaultComponents: CostingTemplateComponent[];
};

export const COSTING_TEMPLATES: CostingTemplate[] = [
  {
    key: "ao-thun",
    name: "Áo thun",
    description: "Mẫu chuẩn cho áo thun đồng phục/corporate phổ thông.",
    defaultUnit: "cái",
    defaultMaterialName: "Cotton 65/35",
    defaultFabricPrice: 135000,
    defaultFabricConsumption: 3.7,
    defaultRibCostPerUnit: 4600,
    defaultOverheadRate: 5,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt", type: "CUTTING", unitCost: 1000, quantityFactor: 1 },
      { label: "May", type: "SEWING", unitCost: 20000, quantityFactor: 1 },
      { label: "In", type: "PRINTING", unitCost: 9000, quantityFactor: 1 },
      { label: "Đóng gói + bao bì, thùng", type: "PACKAGING", unitCost: 1000, quantityFactor: 1 },
    ],
  },
  {
    key: "ao-polo",
    name: "Áo polo",
    description: "Mẫu polo có bo cổ/tay và gia công may hoàn thiện.",
    defaultUnit: "cái",
    defaultMaterialName: "Cá sấu 65/35",
    defaultFabricPrice: 148000,
    defaultFabricConsumption: 3.5,
    defaultRibCostPerUnit: 6500,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt", type: "CUTTING", unitCost: 1500, quantityFactor: 1 },
      { label: "May", type: "SEWING", unitCost: 24000, quantityFactor: 1 },
      { label: "Thêu logo", type: "EMBROIDERY", unitCost: 5500, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1200, quantityFactor: 1 },
    ],
  },
  {
    key: "hoodie",
    name: "Hoodie",
    description: "Mẫu hoodie nỉ có công may và hoàn thiện cao hơn.",
    defaultUnit: "cái",
    defaultMaterialName: "Nỉ da cá 2 chiều",
    defaultFabricPrice: 180000,
    defaultFabricConsumption: 2.4,
    defaultRibCostPerUnit: 9000,
    defaultOverheadRate: 7,
    defaultTargetMarginRate: 38,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt", type: "CUTTING", unitCost: 2800, quantityFactor: 1 },
      { label: "May hoodie", type: "SEWING", unitCost: 42000, quantityFactor: 1 },
      { label: "In/thêu", type: "PRINTING", unitCost: 12000, quantityFactor: 1 },
      { label: "Giặt hoàn thiện", type: "WASH", unitCost: 3000, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1500, quantityFactor: 1 },
    ],
  },
  {
    key: "tui-canvas",
    name: "Túi canvas / tote",
    description: "Mẫu túi canvas/tote với công may quai, in và đóng gói.",
    defaultUnit: "cái",
    defaultMaterialName: "Canvas 12oz",
    defaultFabricPrice: 98000,
    defaultFabricConsumption: 2.8,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 32,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt thân túi", type: "CUTTING", unitCost: 1400, quantityFactor: 1 },
      { label: "May túi + quai", type: "SEWING", unitCost: 15500, quantityFactor: 1 },
      { label: "In lụa", type: "PRINTING", unitCost: 6500, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 900, quantityFactor: 1 },
    ],
  },
  {
    key: "non",
    name: "Nón",
    description: "Mẫu nón lưỡi trai với công may, thêu/in logo.",
    defaultUnit: "cái",
    defaultMaterialName: "Kaki 65/35",
    defaultFabricPrice: 105000,
    defaultFabricConsumption: 4.5,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 7,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt panel", type: "CUTTING", unitCost: 1300, quantityFactor: 1 },
      { label: "May nón", type: "SEWING", unitCost: 17000, quantityFactor: 1 },
      { label: "Thêu logo", type: "EMBROIDERY", unitCost: 7500, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1000, quantityFactor: 1 },
    ],
  },
  {
    key: "binh-giu-nhiet",
    name: "Bình giữ nhiệt",
    description: "Mẫu thương mại bình giữ nhiệt có in/khắc và logistics.",
    defaultUnit: "cái",
    defaultMaterialName: "Bình inox 500ml",
    defaultFabricPrice: 72000,
    defaultFabricConsumption: 1,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 4,
    defaultTargetMarginRate: 28,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "In UV/khắc laser", type: "PRINTING", unitCost: 7000, quantityFactor: 1 },
      { label: "Hộp + chèn", type: "PACKAGING", unitCost: 4800, quantityFactor: 1 },
      { label: "Vận chuyển nội địa", type: "LOGISTICS", unitCost: 2500, quantityFactor: 1 },
    ],
  },
  {
    key: "bandana",
    name: "Bandana",
    description: "Mẫu khăn bandana có in chuyển nhiệt và may viền.",
    defaultUnit: "cái",
    defaultMaterialName: "Poly mỏng 95gsm",
    defaultFabricPrice: 76000,
    defaultFabricConsumption: 6.2,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 5,
    defaultTargetMarginRate: 34,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt vải", type: "CUTTING", unitCost: 500, quantityFactor: 1 },
      { label: "In chuyển nhiệt", type: "PRINTING", unitCost: 4500, quantityFactor: 1 },
      { label: "May viền", type: "SEWING", unitCost: 1800, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 600, quantityFactor: 1 },
    ],
  },
  {
    key: "gift-set",
    name: "Gift set",
    description: "Mẫu combo quà tặng gồm nhiều hạng mục đóng bộ.",
    defaultUnit: "set",
    defaultMaterialName: "Set quà tiêu chuẩn",
    defaultFabricPrice: 120000,
    defaultFabricConsumption: 1,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 30,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "In logo bộ quà", type: "PRINTING", unitCost: 12000, quantityFactor: 1 },
      { label: "Đóng bộ + quấn nơ", type: "PACKAGING", unitCost: 15000, quantityFactor: 1 },
      { label: "Logistics giao set", type: "LOGISTICS", unitCost: 4000, quantityFactor: 1 },
      { label: "Chi phí QC", type: "OTHER", unitCost: 2500, quantityFactor: 1 },
    ],
  },
  {
    key: "oem-custom",
    name: "OEM / Custom",
    description: "Mẫu khởi điểm cho dự án OEM, cho phép tùy chỉnh sâu.",
    defaultUnit: "cái",
    defaultMaterialName: "Nguyên vật liệu OEM",
    defaultFabricPrice: 150000,
    defaultFabricConsumption: 2.5,
    defaultRibCostPerUnit: 5000,
    defaultOverheadRate: 8,
    defaultTargetMarginRate: 40,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "Cắt mẫu", type: "CUTTING", unitCost: 2500, quantityFactor: 1 },
      { label: "May hoàn thiện", type: "SEWING", unitCost: 25000, quantityFactor: 1 },
      { label: "In/thêu tùy chọn", type: "OTHER", unitCost: 10000, quantityFactor: 1, note: "Điều chỉnh theo yêu cầu kỹ thuật" },
      { label: "QC + đóng gói", type: "PACKAGING", unitCost: 3500, quantityFactor: 1 },
    ],
  },
  {
    key: "print-only",
    name: "Print-only service",
    description: "Mẫu dịch vụ chỉ in trên hàng khách cung cấp.",
    defaultUnit: "cái",
    defaultMaterialName: "Hàng khách cung cấp",
    defaultFabricPrice: 0,
    defaultFabricConsumption: 1,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 4,
    defaultTargetMarginRate: 30,
    defaultVatRate: 8,
    defaultComponents: [
      { label: "In lụa/chuyển nhiệt", type: "PRINTING", unitCost: 8000, quantityFactor: 1 },
      { label: "Sấy/ép hoàn thiện", type: "OTHER", unitCost: 1200, quantityFactor: 1 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 700, quantityFactor: 1 },
      { label: "Vận chuyển", type: "LOGISTICS", unitCost: 1500, quantityFactor: 1 },
    ],
  },
];
