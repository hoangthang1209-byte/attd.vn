import type { ClassifierInput, MediaClassifier } from "@/features/media/intelligence/provider-interfaces";
import type { ClassifierLabel } from "@/features/media/intelligence/intelligence.types";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

type Rule = { label: ClassifierLabel; patterns: RegExp[]; weight: number };

const RULES: Rule[] = [
  { label: "polo", patterns: [/\bpolo\b/, /\bao polo\b/], weight: 10 },
  { label: "tshirt", patterns: [/\bt-?shirt\b/, /\bao thun\b/, /\btee\b/], weight: 10 },
  { label: "hoodie", patterns: [/\bhoodie\b/, /\bao khoac hoodie\b/], weight: 10 },
  { label: "jacket", patterns: [/\bjacket\b/, /\bao khoac\b/, /\bwindsbreaker\b/], weight: 8 },
  { label: "hat", patterns: [/\bhat\b/, /\bmu\b/, /\bcap\b/, /\bnón\b/], weight: 8 },
  { label: "bag", patterns: [/\bbag\b/, /\btui\b/, /\btote\b/], weight: 8 },
  { label: "bottle", patterns: [/\bbottle\b/, /\bbinh\b/], weight: 8 },
  { label: "label", patterns: [/\blabel\b/, /\bnhan\b/, /\btag\b/], weight: 7 },
  { label: "fabric", patterns: [/\bfabric\b/, /\bvai\b/, /\bcotton\b/, /\bcvc\b/, /\bpolyester\b/], weight: 9 },
  { label: "closeup", patterns: [/\bclose ?up\b/, /\bcận\b/, /\bdetail\b/, /\bchi tiet\b/], weight: 7 },
  { label: "logo", patterns: [/\blogo\b/], weight: 9 },
  { label: "embroidery", patterns: [/\bembroidery\b/, /\btheu\b/], weight: 10 },
  { label: "silkscreen", patterns: [/\bsilk ?screen\b/, /\bin luoi\b/, /\bscreen print\b/], weight: 9 },
  { label: "dtf", patterns: [/\bdtf\b/], weight: 10 },
  { label: "heat_transfer", patterns: [/\bheat ?transfer\b/, /\bin ep\b/, /\bep nhiet\b/], weight: 9 },
  { label: "factory", patterns: [/\bfactory\b/, /\bxuong\b/, /\bnha may\b/], weight: 9 },
  { label: "qc", patterns: [/\bqc\b/, /\bquality\b/, /\bkiem tra\b/], weight: 8 },
  { label: "packing", patterns: [/\bpacking\b/, /\bdong goi\b/, /\bpack\b/], weight: 8 },
  { label: "shipping", patterns: [/\bshipping\b/, /\bgiao hang\b/, /\blogistics\b/], weight: 7 },
  { label: "lifestyle", patterns: [/\blifestyle\b/, /\bon model\b/, /\bwear\b/], weight: 6 },
  { label: "team", patterns: [/\bteam\b/, /\bdoi ngu\b/, /\bstaff\b/], weight: 7 },
  { label: "showroom", patterns: [/\bshowroom\b/, /\bcua hang\b/, /\bstore\b/], weight: 7 },
  { label: "machine", patterns: [/\bmachine\b/, /\bmay\b/, /\bequipment\b/], weight: 6 },
];

/**
 * Deterministic filename/metadata classifier. No Vision AI.
 */
export class DeterministicMediaClassifier implements MediaClassifier {
  async classify(input: ClassifierInput): Promise<{ labels: ClassifierLabel[]; confidence: number }> {
    const haystack = fold(
      [
        input.filename,
        input.originalName ?? "",
        input.title ?? "",
        input.altText ?? "",
        input.caption ?? "",
        ...(input.keywords ?? []),
        ...(input.subjectTerms ?? []),
        ...(input.materialTerms ?? []),
        ...(input.techniqueTerms ?? []),
        ...(input.useCaseTerms ?? []),
        ...(input.industryTerms ?? []),
        input.libraryCode ?? "",
        input.roleCode ?? "",
      ].join(" "),
    );

    const scores = new Map<ClassifierLabel, number>();
    for (const rule of RULES) {
      if (rule.patterns.some((pattern) => pattern.test(haystack))) {
        scores.set(rule.label, (scores.get(rule.label) ?? 0) + rule.weight);
      }
    }

    // Role/library soft boosts
    const role = fold(input.roleCode ?? "");
    if (role.includes("factory")) scores.set("factory", (scores.get("factory") ?? 0) + 4);
    if (role.includes("printing")) scores.set("silkscreen", (scores.get("silkscreen") ?? 0) + 3);
    if (role.includes("embroidery")) scores.set("embroidery", (scores.get("embroidery") ?? 0) + 4);
    if (role.includes("material")) scores.set("fabric", (scores.get("fabric") ?? 0) + 3);
    if (role.includes("logo")) scores.set("logo", (scores.get("logo") ?? 0) + 3);

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { labels: ["unknown"], confidence: 0.2 };

    const topScore = ranked[0][1];
    const labels = ranked.filter(([, score]) => score >= topScore * 0.6).map(([label]) => label);
    const confidence = Math.min(0.95, 0.35 + topScore / 20);
    return { labels: labels.slice(0, 5), confidence };
  }
}

export const defaultMediaClassifier = new DeterministicMediaClassifier();
