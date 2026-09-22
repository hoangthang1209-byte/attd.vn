/** Canonical automation lane identifiers in display order (issue #111). */
export const AUTOMATION_CANONICAL_LANE_IDS = [
  "lead-sales-crm",
  "public-website-ui",
  "automation-platform",
  "marketing-content-seo",
  "quotation-quote-builder",
  "internal-admin-mobile-ux",
  "order-production-operations",
] as const;

export type AutomationCanonicalLaneId = (typeof AUTOMATION_CANONICAL_LANE_IDS)[number];

export type AutomationCanonicalLane = {
  id: AutomationCanonicalLaneId;
  label: string;
};

/** Seven lanes always rendered in this order on the control board. */
export const AUTOMATION_CANONICAL_LANES: AutomationCanonicalLane[] = [
  { id: "lead-sales-crm", label: "Lead & Sales / CRM" },
  { id: "public-website-ui", label: "Public Website UI" },
  { id: "automation-platform", label: "Automation Platform" },
  { id: "marketing-content-seo", label: "Marketing / Content / SEO" },
  { id: "quotation-quote-builder", label: "Quotation / Quote Builder" },
  { id: "internal-admin-mobile-ux", label: "Internal Admin Mobile UX" },
  { id: "order-production-operations", label: "Order & Production Operations" },
];

const LANE_ALIAS_ENTRIES: Array<[AutomationCanonicalLaneId, string[]]> = [
  [
    "lead-sales-crm",
    [
      "Lead & Sales / CRM",
      "Lead & Sales",
      "Lead and Sales",
      "CRM",
      "Sales / CRM",
    ],
  ],
  [
    "public-website-ui",
    ["Public Website UI", "Public Website", "Website UI", "Homepage"],
  ],
  [
    "automation-platform",
    ["Automation Platform", "Automation", "Builder Automation"],
  ],
  [
    "marketing-content-seo",
    [
      "Marketing / Content / SEO",
      "Marketing / SEO",
      "Marketing",
      "Content / SEO",
      "SEO",
    ],
  ],
  [
    "quotation-quote-builder",
    [
      "Quotation / Quote Builder",
      "Quotation",
      "Quote Builder",
      "Quotes",
    ],
  ],
  [
    "internal-admin-mobile-ux",
    [
      "Internal Admin Mobile UX",
      "Admin Mobile UX",
      "Mobile UX",
      "Admin Mobile",
    ],
  ],
  [
    "order-production-operations",
    [
      "Order & Production Operations",
      "Order & Production",
      "Production Operations",
      "Orders / Production",
    ],
  ],
];

function normalizeTaskAreaKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const LANE_ALIAS_LOOKUP = new Map<string, AutomationCanonicalLaneId>();

for (const [laneId, aliases] of LANE_ALIAS_ENTRIES) {
  for (const alias of aliases) {
    LANE_ALIAS_LOOKUP.set(normalizeTaskAreaKey(alias), laneId);
  }
}

/** Map a parsed TASK_AREA string to a canonical lane, or null when unclassified/unknown. */
export function resolveCanonicalLaneId(taskArea: string): AutomationCanonicalLaneId | null {
  const normalized = normalizeTaskAreaKey(taskArea);
  if (!normalized || normalized === normalizeTaskAreaKey("Chưa phân loại")) {
    return null;
  }
  return LANE_ALIAS_LOOKUP.get(normalized) ?? null;
}

export function getCanonicalLaneById(
  laneId: AutomationCanonicalLaneId,
): AutomationCanonicalLane {
  const lane = AUTOMATION_CANONICAL_LANES.find((entry) => entry.id === laneId);
  if (!lane) {
    throw new Error(`Unknown canonical lane: ${laneId}`);
  }
  return lane;
}
