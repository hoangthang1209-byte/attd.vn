export type KnowledgeStalenessInput = {
  expiresAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
  verifiedAt?: string | Date | null;
  reviewIntervalDays?: number | null;
  now?: Date;
};

export type KnowledgeReviewStatus = {
  stale: boolean;
  reviewDue: boolean;
  expired: boolean;
  reasons: string[];
  daysSinceVerified: number | null;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calculateKnowledgeStaleness(input: KnowledgeStalenessInput): KnowledgeReviewStatus {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  let stale = false;
  let reviewDue = false;
  let expired = false;

  const expiresAt = toDate(input.expiresAt);
  if (expiresAt && expiresAt.getTime() < now.getTime()) {
    stale = true;
    expired = true;
    reasons.push("expiresAt in the past");
  }

  const nextReviewAt = toDate(input.nextReviewAt);
  if (nextReviewAt && nextReviewAt.getTime() < now.getTime()) {
    reviewDue = true;
    reasons.push("nextReviewAt overdue");
  }

  const lastVerified = toDate(input.lastVerifiedAt) ?? toDate(input.verifiedAt);
  let daysSinceVerified: number | null = null;
  if (lastVerified) {
    daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (24 * 60 * 60 * 1000));
    if (
      input.reviewIntervalDays != null &&
      input.reviewIntervalDays > 0 &&
      daysSinceVerified > input.reviewIntervalDays
    ) {
      stale = true;
      reviewDue = true;
      reasons.push(`lastVerifiedAt older than reviewIntervalDays (${input.reviewIntervalDays})`);
    }
  }

  return { stale, reviewDue, expired, reasons, daysSinceVerified };
}

export function getKnowledgeReviewStatus(input: KnowledgeStalenessInput): KnowledgeReviewStatus {
  return calculateKnowledgeStaleness(input);
}
