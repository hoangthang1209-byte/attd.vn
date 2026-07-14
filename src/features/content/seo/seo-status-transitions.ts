import type { SeoStrategyStatus, SeoTopicStatus } from "@prisma/client";

const STRATEGY_TRANSITIONS: Record<SeoStrategyStatus, SeoStrategyStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  COMPLETED: ["ARCHIVED", "ACTIVE"],
  ARCHIVED: ["DRAFT"],
};

const TOPIC_TRANSITIONS: Record<SeoTopicStatus, SeoTopicStatus[]> = {
  IDEA: ["RESEARCHING", "APPROVED", "PAUSED", "REJECTED", "ARCHIVED"],
  RESEARCHING: ["IDEA", "APPROVED", "PAUSED", "REJECTED", "ARCHIVED"],
  APPROVED: ["BRIEF_READY", "DRAFTING", "PAUSED", "REJECTED", "ARCHIVED"],
  BRIEF_READY: ["DRAFTING", "APPROVED", "PAUSED", "ARCHIVED"],
  DRAFTING: ["REVIEW", "BRIEF_READY", "PAUSED", "ARCHIVED"],
  REVIEW: ["DRAFTING", "PUBLISHED", "PAUSED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  PAUSED: ["IDEA", "RESEARCHING", "APPROVED", "BRIEF_READY", "DRAFTING", "REVIEW", "ARCHIVED"],
  REJECTED: ["IDEA", "RESEARCHING", "ARCHIVED"],
  ARCHIVED: ["IDEA"],
};

export function canTransitionStrategy(from: SeoStrategyStatus, to: SeoStrategyStatus): boolean {
  if (from === to) return true;
  return STRATEGY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionTopic(from: SeoTopicStatus, to: SeoTopicStatus): boolean {
  if (from === to) return true;
  return TOPIC_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTopicTransition(from: SeoTopicStatus, to: SeoTopicStatus): void {
  if (!canTransitionTopic(from, to)) {
    throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}.`);
  }
}

export function assertStrategyTransition(from: SeoStrategyStatus, to: SeoStrategyStatus): void {
  if (!canTransitionStrategy(from, to)) {
    throw new Error(`Không thể chuyển trạng thái chiến lược từ ${from} sang ${to}.`);
  }
}
