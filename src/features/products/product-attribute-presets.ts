import type { ProductAttributeDisplayType } from "@prisma/client";

export type AttributePresetKey =
  | "color"
  | "size"
  | "material"
  | "fit"
  | "collar"
  | "gender"
  | "capacity"
  | "sleeve"
  | "fabric-type"
  | "pack-size";

export type AttributePresetValueDef = {
  key: string;
  name: string;
  code: string;
  slug: string;
  hexCode?: string | null;
  sortOrder: number;
};

export type AttributePresetDef = {
  key: AttributePresetKey;
  name: string;
  description: string;
  icon: string;
  attribute: {
    name: string;
    code: string;
    slug: string;
    displayType: ProductAttributeDisplayType;
    isVariantAttribute: boolean;
    isSpecificationAttribute: boolean;
    sortOrder: number;
  };
  values: AttributePresetValueDef[];
};

export const ATTRIBUTE_PRESET_LIBRARY: AttributePresetDef[] = [
  {
    key: "color",
    name: "Màu sắc",
    description: "Bảng màu chuẩn cho biến thể sản phẩm.",
    icon: "🎨",
    attribute: {
      name: "Màu sắc",
      code: "COLOR",
      slug: "mau-sac",
      displayType: "COLOR_SWATCH",
      isVariantAttribute: true,
      isSpecificationAttribute: false,
      sortOrder: 1,
    },
    values: [
      { key: "blk", name: "Đen", code: "BLK", slug: "den", hexCode: "#1A1A1A", sortOrder: 1 },
      { key: "wht", name: "Trắng", code: "WHT", slug: "trang", hexCode: "#F5F5F5", sortOrder: 2 },
      { key: "nvy", name: "Navy", code: "NVY", slug: "navy", hexCode: "#102A43", sortOrder: 3 },
      { key: "red", name: "Đỏ", code: "RED", slug: "do", hexCode: "#D92D20", sortOrder: 4 },
      { key: "gry", name: "Xám", code: "GRY", slug: "xam", hexCode: "#6B7280", sortOrder: 5 },
      { key: "bei", name: "Be", code: "BEI", slug: "be", hexCode: "#D8C3A5", sortOrder: 6 },
      { key: "blu", name: "Xanh dương", code: "BLU", slug: "xanh-duong", hexCode: "#2563EB", sortOrder: 7 },
      { key: "grn", name: "Xanh lá", code: "GRN", slug: "xanh-la", hexCode: "#16A34A", sortOrder: 8 },
      { key: "ylw", name: "Vàng", code: "YLW", slug: "vang", hexCode: "#EAB308", sortOrder: 9 },
      { key: "org", name: "Cam", code: "ORG", slug: "cam", hexCode: "#F97316", sortOrder: 10 },
    ],
  },
  {
    key: "size",
    name: "Kích thước",
    description: "Size chuẩn cho quần áo và phụ kiện may mặc.",
    icon: "📏",
    attribute: {
      name: "Kích thước",
      code: "SIZE",
      slug: "kich-thuoc",
      displayType: "SIZE",
      isVariantAttribute: true,
      isSpecificationAttribute: false,
      sortOrder: 2,
    },
    values: [
      { key: "xs", name: "XS", code: "XS", slug: "xs", sortOrder: 1 },
      { key: "s", name: "S", code: "S", slug: "s", sortOrder: 2 },
      { key: "m", name: "M", code: "M", slug: "m", sortOrder: 3 },
      { key: "l", name: "L", code: "L", slug: "l", sortOrder: 4 },
      { key: "xl", name: "XL", code: "XL", slug: "xl", sortOrder: 5 },
      { key: "2xl", name: "2XL", code: "2XL", slug: "2xl", sortOrder: 6 },
      { key: "3xl", name: "3XL", code: "3XL", slug: "3xl", sortOrder: 7 },
      { key: "free", name: "Free size", code: "FREE", slug: "free-size", sortOrder: 8 },
    ],
  },
  {
    key: "material",
    name: "Chất liệu",
    description: "Chất liệu vải và thành phần cho thông số sản phẩm.",
    icon: "🧵",
    attribute: {
      name: "Chất liệu",
      code: "MATERIAL",
      slug: "chat-lieu",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 3,
    },
    values: [
      { key: "cotton100", name: "Cotton 100%", code: "COTTON100", slug: "cotton-100", sortOrder: 1 },
      { key: "compact", name: "Cotton Compact", code: "COMPACT", slug: "cotton-compact", sortOrder: 2 },
      { key: "cvc", name: "Cotton CVC", code: "CVC", slug: "cotton-cvc", sortOrder: 3 },
      { key: "cotpes", name: "Cotton Polyester", code: "COTPES", slug: "cotton-polyester", sortOrder: 4 },
      { key: "pique", name: "Thể thao Pique", code: "PIQUE", slug: "the-thao-pique", sortOrder: 5 },
      { key: "piquecs", name: "Pique cá sấu", code: "PIQUECS", slug: "pique-ca-sau", sortOrder: 6 },
      { key: "cool", name: "Thun lạnh", code: "COOL", slug: "thun-lanh", sortOrder: 7 },
      { key: "interlock", name: "Interlock", code: "INTERLOCK", slug: "interlock", sortOrder: 8 },
      { key: "poly", name: "Polyester", code: "POLY", slug: "polyester", sortOrder: 9 },
      { key: "nylon", name: "Nylon", code: "NYLON", slug: "nylon", sortOrder: 10 },
      { key: "canvas", name: "Canvas", code: "CANVAS", slug: "canvas", sortOrder: 11 },
      { key: "pu", name: "Da PU", code: "PU", slug: "da-pu", sortOrder: 12 },
      { key: "khaki", name: "Kaki", code: "KHAKI", slug: "kaki", sortOrder: 13 },
      { key: "denim", name: "Denim", code: "DENIM", slug: "denim", sortOrder: 14 },
    ],
  },
  {
    key: "fit",
    name: "Form dáng",
    description: "Kiểu form dáng cho mô tả và thông số sản phẩm.",
    icon: "👕",
    attribute: {
      name: "Form dáng",
      code: "FIT",
      slug: "form-dang",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 4,
    },
    values: [
      { key: "regular", name: "Regular fit", code: "REGULAR", slug: "regular-fit", sortOrder: 1 },
      { key: "slim", name: "Slim fit", code: "SLIM", slug: "slim-fit", sortOrder: 2 },
      { key: "oversize", name: "Oversize", code: "OVERSIZE", slug: "oversize", sortOrder: 3 },
      { key: "boxy", name: "Boxy fit", code: "BOXY", slug: "boxy-fit", sortOrder: 4 },
      { key: "relaxed", name: "Relaxed fit", code: "RELAXED", slug: "relaxed-fit", sortOrder: 5 },
      { key: "unisex", name: "Unisex", code: "UNISEX", slug: "unisex", sortOrder: 6 },
    ],
  },
  {
    key: "collar",
    name: "Kiểu cổ",
    description: "Kiểu cổ áo cho thông số sản phẩm.",
    icon: "👔",
    attribute: {
      name: "Kiểu cổ",
      code: "COLLAR",
      slug: "kieu-co",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 5,
    },
    values: [
      { key: "crew", name: "Cổ tròn", code: "CREW", slug: "co-tron", sortOrder: 1 },
      { key: "polo", name: "Cổ polo", code: "POLO", slug: "co-polo", sortOrder: 2 },
      { key: "vneck", name: "Cổ V", code: "VNECK", slug: "co-v", sortOrder: 3 },
      { key: "shirt", name: "Cổ sơ mi", code: "SHIRT", slug: "co-so-mi", sortOrder: 4 },
      { key: "turndown", name: "Cổ bẻ", code: "TURNDOWN", slug: "co-be", sortOrder: 5 },
      { key: "turtle", name: "Cổ lọ", code: "TURTLENECK", slug: "co-lo", sortOrder: 6 },
    ],
  },
  {
    key: "gender",
    name: "Giới tính",
    description: "Phân loại giới tính cho thông số sản phẩm.",
    icon: "👥",
    attribute: {
      name: "Giới tính",
      code: "GENDER",
      slug: "gioi-tinh",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 6,
    },
    values: [
      { key: "men", name: "Nam", code: "MEN", slug: "nam", sortOrder: 1 },
      { key: "women", name: "Nữ", code: "WOMEN", slug: "nu", sortOrder: 2 },
      { key: "unisex", name: "Unisex", code: "UNISEX", slug: "unisex", sortOrder: 3 },
      { key: "kids", name: "Trẻ em", code: "KIDS", slug: "tre-em", sortOrder: 4 },
    ],
  },
  {
    key: "capacity",
    name: "Dung tích",
    description: "Dung tích cho bình, ly, túi và sản phẩm đóng gói lỏng.",
    icon: "🥤",
    attribute: {
      name: "Dung tích",
      code: "CAPACITY",
      slug: "dung-tich",
      displayType: "SELECT",
      isVariantAttribute: true,
      isSpecificationAttribute: true,
      sortOrder: 7,
    },
    values: [
      { key: "350ml", name: "350 ml", code: "350ML", slug: "350-ml", sortOrder: 1 },
      { key: "500ml", name: "500 ml", code: "500ML", slug: "500-ml", sortOrder: 2 },
      { key: "750ml", name: "750 ml", code: "750ML", slug: "750-ml", sortOrder: 3 },
      { key: "1l", name: "1 lít", code: "1L", slug: "1-lit", sortOrder: 4 },
      { key: "15l", name: "1.5 lít", code: "1.5L", slug: "1-5-lit", sortOrder: 5 },
    ],
  },
  {
    key: "sleeve",
    name: "Kiểu tay áo",
    description: "Kiểu tay áo cho thông số sản phẩm.",
    icon: "💪",
    attribute: {
      name: "Kiểu tay áo",
      code: "SLEEVE",
      slug: "kieu-tay-ao",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 8,
    },
    values: [
      { key: "short", name: "Tay ngắn", code: "SHORT", slug: "tay-ngan", sortOrder: 1 },
      { key: "long", name: "Tay dài", code: "LONG", slug: "tay-dai", sortOrder: 2 },
      { key: "sleeveless", name: "Sát nách", code: "SLEEVELESS", slug: "sat-nach", sortOrder: 3 },
      { key: "raglan", name: "Raglan", code: "RAGLAN", slug: "raglan", sortOrder: 4 },
    ],
  },
  {
    key: "fabric-type",
    name: "Loại vải",
    description: "Phân loại cấu trúc/kỹ thuật dệt vải.",
    icon: "🧶",
    attribute: {
      name: "Loại vải",
      code: "FABTYPE",
      slug: "loai-vai",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 9,
    },
    values: [
      { key: "knit", name: "Dệt kim", code: "KNIT", slug: "det-kim", sortOrder: 1 },
      { key: "woven", name: "Dệt thoi", code: "WOVEN", slug: "det-thoi", sortOrder: 2 },
      { key: "fleece", name: "Nỉ", code: "FLEECE", slug: "ni", sortOrder: 3 },
      { key: "mesh", name: "Lưới", code: "MESH", slug: "luoi", sortOrder: 4 },
    ],
  },
  {
    key: "pack-size",
    name: "Kích thước đóng gói",
    description: "Kích thước đóng gói cho quà tặng và hàng OEM.",
    icon: "📦",
    attribute: {
      name: "Kích thước đóng gói",
      code: "PACKSIZE",
      slug: "kich-thuoc-dong-goi",
      displayType: "SELECT",
      isVariantAttribute: false,
      isSpecificationAttribute: true,
      sortOrder: 10,
    },
    values: [
      { key: "s", name: "Nhỏ (S)", code: "S", slug: "nho-s", sortOrder: 1 },
      { key: "m", name: "Vừa (M)", code: "M", slug: "vua-m", sortOrder: 2 },
      { key: "l", name: "Lớn (L)", code: "L", slug: "lon-l", sortOrder: 3 },
      { key: "xl", name: "Rất lớn (XL)", code: "XL", slug: "rat-lon-xl", sortOrder: 4 },
    ],
  },
];

const PRESET_MAP = new Map(ATTRIBUTE_PRESET_LIBRARY.map((preset) => [preset.key, preset]));

export function getAttributePreset(key: string): AttributePresetDef | undefined {
  return PRESET_MAP.get(key as AttributePresetKey);
}

export function listAttributePresets(): AttributePresetDef[] {
  return ATTRIBUTE_PRESET_LIBRARY;
}

export function isValidAttributePresetKey(key: string): key is AttributePresetKey {
  return PRESET_MAP.has(key as AttributePresetKey);
}
