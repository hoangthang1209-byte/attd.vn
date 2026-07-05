export type ManufacturingEvidenceCategory =
  | "warehouse"
  | "production"
  | "cutting"
  | "sewing"
  | "printing"
  | "embroidery"
  | "qc"
  | "packing"
  | "delivery"
  | "material-sample"
  | "material-samples"
  | "real-order"
  | "real-orders"
  | "case-study"
  | "case-studies"
  | "machines"
  | "certificates"
  | "team"
  | "videos";

export type ManufacturingEvidenceSurface =
  | "homepage"
  | "category"
  | "pdp"
  | "dealer"
  | "blog"
  | "rfq"
  | "quote-pdf";

export type ManufacturingEvidenceItem = {
  id: string;
  title: string;
  description: string;
  category: ManufacturingEvidenceCategory;
  imageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  alt: string;
  categoryName?: string;
  tags: readonly string[];
  applicableSurfaces: readonly ManufacturingEvidenceSurface[];
  relatedProductTypes?: readonly string[];
  priority?: number;
  slug?: string;
  href?: string;
  featured?: boolean;
};
