import type { CostingComponentType } from "@/features/pricing/costing-types";

export type CostingBomPresetCategory =
  | "APPAREL"
  | "BAG"
  | "HEADWEAR"
  | "DRINKWARE"
  | "ACCESSORY"
  | "GIFT_SET"
  | "PRINT_SERVICE"
  | "OEM";

export type CostingBomPresetItem = {
  label: string;
  type: CostingComponentType;
  unitCost: number;
  quantityFactor?: number;
  note?: string;
};

export type CostingBomPreset = {
  key: string;
  name: string;
  category: CostingBomPresetCategory;
  description: string;
  defaultUnit?: string;
  defaultMaterialName?: string;
  defaultFabricPrice?: number;
  defaultFabricConsumption?: number;
  defaultRibCostPerUnit?: number;
  defaultOverheadRate?: number;
  defaultTargetMarginRate?: number;
  defaultVatRate?: number;
  items: CostingBomPresetItem[];
};

export const COSTING_BOM_PRESET_CATEGORY_LABELS: Record<CostingBomPresetCategory, string> = {
  APPAREL: "Apparel",
  BAG: "Bag",
  HEADWEAR: "Headwear",
  DRINKWARE: "Drinkware",
  ACCESSORY: "Accessory",
  GIFT_SET: "Gift set",
  PRINT_SERVICE: "Print service",
  OEM: "OEM",
};

export const COSTING_BOM_PRESETS: CostingBomPreset[] = [
  {
    key: "ao-thun-co-ban",
    name: "Áo thun cơ bản",
    category: "APPAREL",
    description: "BOM costing cho áo thun đồng phục/corporate phổ thông.",
    defaultUnit: "cái",
    defaultMaterialName: "Cotton 65/35",
    defaultFabricPrice: 135000,
    defaultFabricConsumption: 3.7,
    defaultRibCostPerUnit: 4600,
    defaultOverheadRate: 5,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    items: [
      { label: "Vải chính", type: "MATERIAL", unitCost: 36500, note: "Ước tính từ giá vải / định mức" },
      { label: "Cắt", type: "CUTTING", unitCost: 1000 },
      { label: "May áo thun", type: "SEWING", unitCost: 20000 },
      { label: "In", type: "PRINTING", unitCost: 9000 },
      { label: "Nhãn cổ", type: "OTHER", unitCost: 800 },
      { label: "Wash care", type: "OTHER", unitCost: 600 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 3000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "ao-polo",
    name: "Áo polo",
    category: "APPAREL",
    description: "BOM costing cho áo polo có bo cổ/tay, nút và hoàn thiện.",
    defaultUnit: "cái",
    defaultMaterialName: "Cá sấu 65/35",
    defaultFabricPrice: 148000,
    defaultFabricConsumption: 3.5,
    defaultRibCostPerUnit: 6500,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    items: [
      { label: "Vải chính", type: "MATERIAL", unitCost: 42300, note: "Ước tính từ giá vải / định mức" },
      { label: "Bo cổ", type: "RIB", unitCost: 2500 },
      { label: "Bo tay", type: "RIB", unitCost: 2000 },
      { label: "Cắt", type: "CUTTING", unitCost: 1500 },
      { label: "May polo", type: "SEWING", unitCost: 24000 },
      { label: "Nút", type: "OTHER", unitCost: 500 },
      { label: "In / thêu logo", type: "PRINTING", unitCost: 11000 },
      { label: "Nhãn cổ", type: "OTHER", unitCost: 800 },
      { label: "Wash care", type: "OTHER", unitCost: 600 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 3000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "hoodie",
    name: "Hoodie",
    category: "APPAREL",
    description: "BOM costing cho hoodie nỉ với bo, dây rút và hoàn thiện.",
    defaultUnit: "cái",
    defaultMaterialName: "Nỉ da cá 2 chiều",
    defaultFabricPrice: 180000,
    defaultFabricConsumption: 2.4,
    defaultRibCostPerUnit: 9000,
    defaultOverheadRate: 7,
    defaultTargetMarginRate: 38,
    defaultVatRate: 8,
    items: [
      { label: "Vải chính", type: "MATERIAL", unitCost: 75000, note: "Ước tính từ giá vải / định mức" },
      { label: "Bo tay + bo lai", type: "RIB", unitCost: 4500 },
      { label: "Dây rút", type: "OTHER", unitCost: 1200 },
      { label: "Mắt cáo", type: "OTHER", unitCost: 800 },
      { label: "Cắt", type: "CUTTING", unitCost: 2800 },
      { label: "May hoodie", type: "SEWING", unitCost: 42000 },
      { label: "In / thêu", type: "PRINTING", unitCost: 12000 },
      { label: "Nhãn cổ", type: "OTHER", unitCost: 800 },
      { label: "Wash care", type: "OTHER", unitCost: 600 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 3500 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "tui-canvas",
    name: "Túi canvas / tote",
    category: "BAG",
    description: "BOM costing cho túi canvas/tote có quai, in và đóng gói.",
    defaultUnit: "cái",
    defaultMaterialName: "Canvas 12oz",
    defaultFabricPrice: 98000,
    defaultFabricConsumption: 2.8,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 32,
    defaultVatRate: 8,
    items: [
      { label: "Vải canvas", type: "MATERIAL", unitCost: 35000, note: "Ước tính từ giá vải / định mức" },
      { label: "Quai túi", type: "OTHER", unitCost: 2500 },
      { label: "Cắt", type: "CUTTING", unitCost: 1400 },
      { label: "May túi", type: "SEWING", unitCost: 15500 },
      { label: "In túi", type: "PRINTING", unitCost: 6500 },
      { label: "Nhãn", type: "OTHER", unitCost: 800 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 3000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "non-cap",
    name: "Nón cap",
    category: "HEADWEAR",
    description: "BOM costing cho nón lưỡi trai với thêu/in logo.",
    defaultUnit: "cái",
    defaultMaterialName: "Kaki 65/35",
    defaultFabricPrice: 105000,
    defaultFabricConsumption: 4.5,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 7,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    items: [
      { label: "Thân nón", type: "MATERIAL", unitCost: 23300, note: "Ước tính từ giá vải / định mức" },
      { label: "Lưỡi trai", type: "MATERIAL", unitCost: 3500 },
      { label: "Khóa chỉnh", type: "OTHER", unitCost: 1500 },
      { label: "May nón", type: "SEWING", unitCost: 17000 },
      { label: "Thêu / in logo", type: "EMBROIDERY", unitCost: 7500 },
      { label: "Nhãn", type: "OTHER", unitCost: 800 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 3000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "binh-giu-nhiet",
    name: "Bình giữ nhiệt",
    category: "DRINKWARE",
    description: "BOM costing cho bình giữ nhiệt có in/khắc và logistics.",
    defaultUnit: "cái",
    defaultMaterialName: "Bình inox 500ml",
    defaultFabricPrice: 72000,
    defaultFabricConsumption: 1,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 4,
    defaultTargetMarginRate: 28,
    defaultVatRate: 8,
    items: [
      { label: "Bình giữ nhiệt", type: "MATERIAL", unitCost: 72000 },
      { label: "In UV / khắc laser", type: "PRINTING", unitCost: 7000 },
      { label: "Hộp giấy", type: "PACKAGING", unitCost: 4500 },
      { label: "Tem", type: "PACKAGING", unitCost: 800 },
      { label: "Carton", type: "PACKAGING", unitCost: 3000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
      { label: "Logistics", type: "LOGISTICS", unitCost: 2500 },
    ],
  },
  {
    key: "bandana",
    name: "Bandana",
    category: "ACCESSORY",
    description: "BOM costing cho khăn bandana in chuyển nhiệt và may viền.",
    defaultUnit: "cái",
    defaultMaterialName: "Poly mỏng 95gsm",
    defaultFabricPrice: 76000,
    defaultFabricConsumption: 6.2,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 5,
    defaultTargetMarginRate: 34,
    defaultVatRate: 8,
    items: [
      { label: "Vải bandana", type: "MATERIAL", unitCost: 12300, note: "Ước tính từ giá vải / định mức" },
      { label: "In chuyển nhiệt", type: "PRINTING", unitCost: 4500 },
      { label: "May cuốn biên", type: "SEWING", unitCost: 1800 },
      { label: "Tem", type: "PACKAGING", unitCost: 800 },
      { label: "Túi PE", type: "PACKAGING", unitCost: 500 },
      { label: "Carton", type: "PACKAGING", unitCost: 2500 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
    ],
  },
  {
    key: "gift-set-doanh-nghiep",
    name: "Gift set doanh nghiệp",
    category: "GIFT_SET",
    description: "BOM costing cho combo quà tặng doanh nghiệp nhiều hạng mục.",
    defaultUnit: "set",
    defaultMaterialName: "Set quà tiêu chuẩn",
    defaultFabricPrice: 120000,
    defaultFabricConsumption: 1,
    defaultRibCostPerUnit: 0,
    defaultOverheadRate: 6,
    defaultTargetMarginRate: 30,
    defaultVatRate: 8,
    items: [
      { label: "Sản phẩm chính", type: "MATERIAL", unitCost: 85000 },
      { label: "Sản phẩm phụ", type: "MATERIAL", unitCost: 35000 },
      { label: "Hộp gift set", type: "PACKAGING", unitCost: 15000 },
      { label: "In logo", type: "PRINTING", unitCost: 12000 },
      { label: "Thiệp / tag", type: "PACKAGING", unitCost: 2500 },
      { label: "Túi giấy", type: "PACKAGING", unitCost: 3500 },
      { label: "Carton", type: "PACKAGING", unitCost: 5000 },
      { label: "QC", type: "OTHER", unitCost: 2500 },
      { label: "Logistics", type: "LOGISTICS", unitCost: 4000 },
    ],
  },
  {
    key: "print-only",
    name: "Print-only service",
    category: "PRINT_SERVICE",
    description: "BOM costing cho dịch vụ in/setup file không gia công may.",
    defaultUnit: "lô",
    defaultOverheadRate: 3,
    defaultTargetMarginRate: 30,
    defaultVatRate: 8,
    items: [
      { label: "Setup file", type: "OTHER", unitCost: 500000, note: "Phí setup máy/in" },
      { label: "In", type: "PRINTING", unitCost: 9000 },
      { label: "QC", type: "OTHER", unitCost: 1500 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 1000 },
      { label: "Logistics", type: "LOGISTICS", unitCost: 15000, note: "Theo đơn/lô" },
    ],
  },
  {
    key: "oem-custom",
    name: "OEM / Custom",
    category: "OEM",
    description: "BOM costing linh hoạt cho đơn OEM/private label tùy chỉnh.",
    defaultUnit: "cái",
    defaultOverheadRate: 8,
    defaultTargetMarginRate: 35,
    defaultVatRate: 8,
    items: [
      { label: "Vật liệu chính", type: "MATERIAL", unitCost: 0, note: "Nhập theo BOM thực tế" },
      { label: "Phụ liệu", type: "OTHER", unitCost: 5000 },
      { label: "R&D / sample", type: "OTHER", unitCost: 150000, note: "Phí mẫu / phát triển" },
      { label: "Cắt", type: "CUTTING", unitCost: 2000 },
      { label: "May / gia công", type: "SEWING", unitCost: 25000 },
      { label: "In / thêu / xử lý bề mặt", type: "PRINTING", unitCost: 12000 },
      { label: "Đóng gói", type: "PACKAGING", unitCost: 2500 },
      { label: "QC", type: "OTHER", unitCost: 2000 },
      { label: "Logistics", type: "LOGISTICS", unitCost: 35000, note: "Theo lô xuất" },
    ],
  },
];
