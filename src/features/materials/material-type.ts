import type { MaterialType } from "@prisma/client";

const MATERIAL_TYPES: MaterialType[] = [
  "MAIN_FABRIC",
  "RIB_FABRIC",
  "LINING",
  "THREAD",
  "ZIPPER",
  "BUTTON",
  "LABEL",
  "HANGTAG",
  "PRINTING",
  "EMBROIDERY",
  "PACKAGING",
  "CARTON",
  "ACCESSORY",
  "OTHER",
];

export function isMaterialType(value: string): value is MaterialType {
  return MATERIAL_TYPES.includes(value as MaterialType);
}
