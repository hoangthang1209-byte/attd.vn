"use client";

import type { PatternStatus, TechPackStatus } from "@prisma/client";
import {
  PATTERN_STATUS_LABELS,
  TECH_PACK_STATUS_LABELS,
} from "@/features/tech-pack/tech-pack-labels";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

function techPackTone(status: TechPackStatus): BadgeTone {
  if (status === "RELEASED") return "success";
  if (status === "SUPERSEDED") return "warning";
  return "neutral";
}

function patternTone(status: PatternStatus): BadgeTone {
  if (status === "APPROVED") return "success";
  if (status === "ARCHIVED") return "warning";
  return "neutral";
}

export function TechPackStatusBadge({ status }: { status: TechPackStatus }) {
  const tone = techPackTone(status);
  return (
    <span className={`tech-pack-status-badge tech-pack-status-badge--${tone}`}>
      {TECH_PACK_STATUS_LABELS[status]}
    </span>
  );
}

export function PatternStatusBadge({ status }: { status: PatternStatus }) {
  const tone = patternTone(status);
  return (
    <span className={`tech-pack-status-badge tech-pack-status-badge--${tone}`}>
      {PATTERN_STATUS_LABELS[status]}
    </span>
  );
}
