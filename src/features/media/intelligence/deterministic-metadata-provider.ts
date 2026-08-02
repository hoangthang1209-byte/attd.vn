import type { MediaBundleSlotType, MediaContentSuitability, MediaOrientation } from "@prisma/client";
import type {
  BundleRecommender,
  MetadataProvider,
  MetadataProviderInput,
} from "@/features/media/intelligence/provider-interfaces";
import type { ClassifierLabel, SuggestedMediaMetadata } from "@/features/media/intelligence/intelligence.types";
import { defaultMediaClassifier } from "@/features/media/intelligence/deterministic-classifier";

function cleanFilename(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function aspectRatio(width?: number | null, height?: number | null): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height);
  return `${Math.round(width / g)}:${Math.round(height / g)}`;
}

function orientationFromSize(width?: number | null, height?: number | null): MediaOrientation | null {
  if (!width || !height) return null;
  if (width === height) return "SQUARE";
  return width > height ? "LANDSCAPE" : "PORTRAIT";
}

const LABEL_TO_SLOT: Partial<Record<ClassifierLabel, MediaBundleSlotType[]>> = {
  polo: ["PRODUCT", "FEATURED", "INLINE"],
  tshirt: ["PRODUCT", "INLINE"],
  hoodie: ["PRODUCT", "INLINE"],
  jacket: ["PRODUCT"],
  fabric: ["MATERIAL", "INLINE"],
  closeup: ["MATERIAL", "INLINE", "PRODUCT"],
  logo: ["TECHNIQUE", "INLINE", "PRODUCT"],
  embroidery: ["TECHNIQUE", "INLINE"],
  silkscreen: ["TECHNIQUE", "PROCESS"],
  dtf: ["TECHNIQUE"],
  heat_transfer: ["TECHNIQUE"],
  factory: ["FACTORY", "PROCESS"],
  qc: ["PROCESS", "FACTORY"],
  packing: ["PACKAGING", "PROCESS"],
  shipping: ["PROCESS", "PACKAGING"],
  lifestyle: ["GALLERY", "HERO", "INLINE"],
  team: ["TEAM", "CUSTOMER"],
  showroom: ["CUSTOMER", "GALLERY"],
  machine: ["FACTORY", "PROCESS"],
};

const LABEL_TO_ROLE: Partial<Record<ClassifierLabel, string>> = {
  polo: "PRODUCT_MAIN",
  tshirt: "PRODUCT_MAIN",
  hoodie: "PRODUCT_MAIN",
  fabric: "MATERIAL",
  closeup: "PRODUCT_DETAIL",
  logo: "LOGO",
  embroidery: "EMBROIDERY",
  silkscreen: "PRINTING",
  dtf: "PRINTING",
  heat_transfer: "PRINTING",
  factory: "FACTORY",
  qc: "PROCESS",
  packing: "PROCESS",
  team: "CASE_STUDY",
  lifestyle: "GALLERY",
};

const LABEL_TO_LIBRARY: Partial<Record<ClassifierLabel, string>> = {
  polo: "PRODUCT",
  tshirt: "PRODUCT",
  hoodie: "PRODUCT",
  jacket: "PRODUCT",
  fabric: "PRODUCT",
  factory: "MANUFACTURING",
  qc: "MANUFACTURING",
  packing: "MANUFACTURING",
  machine: "MANUFACTURING",
  embroidery: "MANUFACTURING",
  silkscreen: "MANUFACTURING",
  dtf: "MANUFACTURING",
  heat_transfer: "MANUFACTURING",
  team: "CASE_STUDY",
  showroom: "CASE_STUDY",
  lifestyle: "MARKETING",
  logo: "BRANDING",
};

const LABEL_TO_SUITABILITY: Partial<Record<ClassifierLabel, MediaContentSuitability[]>> = {
  polo: ["PRODUCT_GALLERY", "BLOG_INLINE", "PRODUCT_DETAIL"],
  fabric: ["MATERIAL_DETAIL", "BLOG_INLINE"],
  embroidery: ["TECHNIQUE_DETAIL", "BLOG_INLINE"],
  silkscreen: ["TECHNIQUE_DETAIL", "PROCESS_STEP"],
  factory: ["FACTORY_STORY", "PROCESS_STEP"],
  packing: ["PROCESS_STEP", "DOCUMENTATION"],
  lifestyle: ["BLOG_COVER", "FEATURED_IMAGE", "BLOG_INLINE"],
  team: ["TEAM_PROFILE", "CASE_STUDY"],
  logo: ["TECHNIQUE_DETAIL", "PRODUCT_DETAIL"],
};

export class DeterministicBundleRecommender implements BundleRecommender {
  async recommendSlots(input: {
    labels: ClassifierLabel[];
    roleCode?: string | null;
    libraryCode?: string | null;
    suitabilities?: string[];
  }): Promise<MediaBundleSlotType[]> {
    const slots = new Set<MediaBundleSlotType>();
    for (const label of input.labels) {
      for (const slot of LABEL_TO_SLOT[label] ?? []) slots.add(slot);
    }
    const role = (input.roleCode ?? "").toUpperCase();
    if (role.includes("HERO") || role.includes("FEATURED")) slots.add("FEATURED");
    if (role.includes("FACTORY")) slots.add("FACTORY");
    if (role.includes("MATERIAL")) slots.add("MATERIAL");
    if (role.includes("PRINT")) slots.add("TECHNIQUE");
    if (!slots.size) slots.add("INLINE");
    return [...slots].slice(0, 6);
  }
}

export class DeterministicMetadataProvider implements MetadataProvider {
  constructor(
    private readonly classifier = defaultMediaClassifier,
    private readonly bundleRecommender = new DeterministicBundleRecommender(),
  ) {}

  async suggest(input: MetadataProviderInput): Promise<SuggestedMediaMetadata> {
    const { labels, confidence } = await this.classifier.classify(input);
    const primary = labels.find((label) => label !== "unknown") ?? "unknown";
    const baseName = cleanFilename(input.originalName || input.filename || "asset");
    const pretty = titleCase(baseName.replace(/\d{6,}/g, " ").replace(/\s+/g, " ").trim() || primary);

    const title = input.title?.trim() || pretty || null;
    const altText =
      input.altText?.trim() ||
      (pretty ? `${pretty} — hình ảnh ATTD` : labels[0] !== "unknown" ? `Ảnh ${labels[0]} ATTD` : null);
    const caption = input.caption?.trim() || (pretty ? pretty : null);

    const keywords = Array.from(
      new Set(
        [
          ...labels.filter((label) => label !== "unknown"),
          ...(input.keywords ?? []),
          ...(input.subjectTerms ?? []),
          ...pretty.toLowerCase().split(" ").filter((token) => token.length >= 3),
        ].map((token) => token.trim().toLowerCase()),
      ),
    ).slice(0, 16);

    const suggestedRoleCode =
      LABEL_TO_ROLE[primary] ??
      (input.roleCode && input.roleCode !== "GENERAL" ? input.roleCode : null) ??
      "GENERAL";
    const suggestedLibraryCode =
      LABEL_TO_LIBRARY[primary] ??
      (input.libraryCode && input.libraryCode !== "GENERAL" ? input.libraryCode : null) ??
      "PRODUCT";

    const suggestedSuitabilities = Array.from(
      new Set(labels.flatMap((label) => LABEL_TO_SUITABILITY[label] ?? [])),
    ).slice(0, 6) as MediaContentSuitability[];

    const suggestedBundleSlots = await this.bundleRecommender.recommendSlots({
      labels,
      roleCode: suggestedRoleCode,
      libraryCode: suggestedLibraryCode,
      suitabilities: suggestedSuitabilities,
    });

    const orientation =
      (input.orientation as MediaOrientation | null) ??
      orientationFromSize(input.width, input.height);

    return {
      title,
      suggestedFilename: pretty ? `${pretty.toLowerCase().replace(/\s+/g, "-")}.jpg` : null,
      altText,
      caption,
      keywords,
      suggestedRoleCode,
      suggestedLibraryCode,
      suggestedBundleSlots,
      orientation,
      aspectRatio: aspectRatio(input.width, input.height),
      primaryColors: input.dominantColor ? [input.dominantColor] : [],
      suggestedProductTerms: labels.filter((label) =>
        ["polo", "tshirt", "hoodie", "jacket", "hat", "bag", "bottle"].includes(label),
      ),
      suggestedIndustryTerms: labels.includes("factory") || labels.includes("qc")
        ? ["manufacturing", "uniform"]
        : ["apparel"],
      suggestedUseCaseTerms: labels.includes("lifestyle")
        ? ["marketing", "campaign"]
        : ["dong-phuc", "catalog"],
      suggestedTechniqueTerms: labels.filter((label) =>
        ["embroidery", "silkscreen", "dtf", "heat_transfer"].includes(label),
      ),
      suggestedMaterialTerms: labels.includes("fabric")
        ? ["cotton", "fabric"]
        : input.materialTerms?.slice(0, 4) ?? [],
      suggestedSubjectTerms: labels.filter((label) => label !== "unknown"),
      suggestedSuitabilities:
        suggestedSuitabilities.length > 0 ? suggestedSuitabilities : ["BLOG_INLINE"],
      classifierLabels: labels,
      confidence,
      source: "DETERMINISTIC",
    };
  }
}

export const defaultMetadataProvider = new DeterministicMetadataProvider();
export const defaultBundleRecommender = new DeterministicBundleRecommender();
