import type {
  ProductionMaterialCategory,
  ProductionTrimCategory,
  TechPackBomCategory,
} from "@prisma/client";

export type BomMasterType = "material" | "trim" | "material_or_trim" | "optional";

const BOM_MASTER_TYPE: Record<TechPackBomCategory, BomMasterType> = {
  MAIN_FABRIC: "material",
  RIB: "material",
  COLLAR: "material_or_trim",
  CUFF: "material_or_trim",
  NECK_LABEL: "trim",
  CARE_LABEL: "trim",
  HANG_TAG: "trim",
  POLY_BAG: "trim",
  CARTON: "trim",
  THREAD: "trim",
  BUTTON: "trim",
  ZIPPER: "trim",
  DRAWCORD: "trim",
  ELASTIC: "trim",
  ACCESSORY: "trim",
  OTHER: "optional",
};

const DEFAULT_MATERIAL_CATEGORY: Partial<Record<TechPackBomCategory, ProductionMaterialCategory>> = {
  MAIN_FABRIC: "MAIN_FABRIC",
  RIB: "RIB",
  COLLAR: "MAIN_FABRIC",
  CUFF: "RIB",
};

const DEFAULT_TRIM_CATEGORY: Partial<Record<TechPackBomCategory, ProductionTrimCategory>> = {
  NECK_LABEL: "LABEL",
  CARE_LABEL: "LABEL",
  HANG_TAG: "LABEL",
  POLY_BAG: "ACCESSORY",
  CARTON: "ACCESSORY",
  THREAD: "THREAD",
  BUTTON: "BUTTON",
  ZIPPER: "ZIPPER",
  DRAWCORD: "DRAWCORD",
  ELASTIC: "ELASTIC",
  ACCESSORY: "ACCESSORY",
  COLLAR: "ACCESSORY",
  CUFF: "ACCESSORY",
};

export function getExpectedBomMasterType(category: TechPackBomCategory): BomMasterType {
  return BOM_MASTER_TYPE[category] ?? "optional";
}

export function isBomMasterLinkRecommended(category: TechPackBomCategory): boolean {
  return getExpectedBomMasterType(category) !== "optional";
}

export function getDefaultProductionMaterialCategory(
  category: TechPackBomCategory,
): ProductionMaterialCategory | null {
  return DEFAULT_MATERIAL_CATEGORY[category] ?? null;
}

export function getDefaultProductionTrimCategory(
  category: TechPackBomCategory,
): ProductionTrimCategory | null {
  return DEFAULT_TRIM_CATEGORY[category] ?? null;
}

export function bomCategoryPrefersMaterialPicker(category: TechPackBomCategory): boolean {
  const t = getExpectedBomMasterType(category);
  return t === "material" || t === "material_or_trim";
}

export function bomCategoryPrefersTrimPicker(category: TechPackBomCategory): boolean {
  const t = getExpectedBomMasterType(category);
  return t === "trim" || t === "material_or_trim";
}
