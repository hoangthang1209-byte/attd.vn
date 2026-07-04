import type { ManufacturingEvidenceSurface } from "@/lib/manufacturing-library.types";

export const MANUFACTURING_SURFACE_DISPLAY_LOCATION: Record<
  ManufacturingEvidenceSurface,
  string
> = {
  homepage: "homepage",
  category: "product-detail",
  pdp: "product-detail",
  dealer: "dealer-landing",
  blog: "blog",
  rfq: "rfq",
  "quote-pdf": "quote-pdf",
};

export const MANUFACTURING_MEDIA_ROLE_PRIORITY = [
  "THUMBNAIL",
  "HERO",
  "EVIDENCE",
  "GALLERY",
  "PROCESS",
  "VIDEO",
] as const;

export const MANUFACTURING_BASE_CATEGORIES = [
  { name: "Warehouse", slug: "warehouse" },
  { name: "Production", slug: "production" },
  { name: "Cutting", slug: "cutting" },
  { name: "Sewing", slug: "sewing" },
  { name: "Printing", slug: "printing" },
  { name: "Embroidery", slug: "embroidery" },
  { name: "QC", slug: "qc" },
  { name: "Packing", slug: "packing" },
  { name: "Delivery", slug: "delivery" },
  { name: "Material Samples", slug: "material-samples" },
  { name: "Real Orders", slug: "real-orders" },
  { name: "Case Studies", slug: "case-studies" },
  { name: "Machines", slug: "machines" },
  { name: "Certificates", slug: "certificates" },
  { name: "Team", slug: "team" },
  { name: "Videos", slug: "videos" },
] as const;

export const MANUFACTURING_BASE_DISPLAY_LOCATIONS = [
  { key: "homepage", name: "Homepage" },
  { key: "product-detail", name: "Product Detail" },
  { key: "dealer-landing", name: "Dealer Landing" },
  { key: "contact", name: "Contact" },
  { key: "blog", name: "Blog" },
  { key: "rfq", name: "RFQ" },
  { key: "quote-pdf", name: "Quote PDF" },
  { key: "dealer-portal", name: "Dealer Portal" },
  { key: "customer-portal", name: "Customer Portal" },
] as const;

export const MANUFACTURING_BASE_WORKFLOWS = [
  {
    name: "Cotton T-Shirt Workflow",
    slug: "cotton-t-shirt-workflow",
    steps: [
      "Artwork",
      "Material Preparation",
      "Cutting",
      "Sewing",
      "Printing or Embroidery",
      "QC",
      "Packing",
      "Delivery",
    ],
  },
  {
    name: "Silkscreen Printing Workflow",
    slug: "silkscreen-printing-workflow",
    steps: [
      "Artwork Check",
      "Film / Screen Preparation",
      "Ink Mixing",
      "Sample Print",
      "Bulk Printing",
      "Curing",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Embroidery Workflow",
    slug: "embroidery-workflow",
    steps: [
      "Artwork Check",
      "Digitizing",
      "Thread Color Matching",
      "Sample Embroidery",
      "Bulk Embroidery",
      "Trimming",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Sublimation Workflow",
    slug: "sublimation-workflow",
    steps: [
      "Artwork Check",
      "Color Proof",
      "Transfer Printing",
      "Heat Press",
      "Cooling",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Packing & Delivery Workflow",
    slug: "packing-delivery-workflow",
    steps: [
      "Final QC",
      "Folding",
      "Polybag / Packaging",
      "Carton Packing",
      "Labeling",
      "Handover",
      "Delivery",
    ],
  },
] as const;
