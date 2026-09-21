import { hasAnyAutomationStatusLabel } from "@/features/automation/automation-github.queries";
import {
  AUTOMATION_STATUS_GITHUB_LABELS,
  TASK_AREA_COMMENT_PREFIX,
} from "@/features/automation/automation-status.parser";

/** Reserved for a future common task label; issues carrying it qualify as development tasks. */
export const DEVELOPMENT_TASK_GITHUB_LABEL = "development-task";

const TASK_AREA_COMMENT_PATTERN = /^TASK_AREA:\s*(.+)$/i;

type LabeledInput = { labels: Array<{ name: string }> | string[] };
type CommentInput = { body: string };

function normalizeLabels(labels: LabeledInput["labels"]): Array<{ name: string }> {
  if (labels.length === 0) return [];
  if (typeof labels[0] === "string") {
    return (labels as string[]).map((name) => ({ name }));
  }
  return labels as Array<{ name: string }>;
}

export function hasRecognizedAutomationStatusLabel(labels: LabeledInput["labels"]): boolean {
  return hasAnyAutomationStatusLabel({ labels: normalizeLabels(labels) }, AUTOMATION_STATUS_GITHUB_LABELS);
}

export function hasDevelopmentTaskLabel(labels: LabeledInput["labels"]): boolean {
  const normalized = normalizeLabels(labels);
  return normalized.some((label) => label.name === DEVELOPMENT_TASK_GITHUB_LABEL);
}

export function hasTaskAreaMarker(comments: readonly CommentInput[]): boolean {
  for (const comment of comments) {
    const body = comment.body.trim();
    if (!body) continue;
    if (TASK_AREA_COMMENT_PATTERN.test(body)) return true;
    if (body.startsWith(TASK_AREA_COMMENT_PREFIX)) return true;
  }
  return false;
}

/**
 * A GitHub issue qualifies as a development task when it has an automation status label,
 * the reserved development-task label, and/or an explicit TASK_AREA comment marker.
 */
export function isRecognizedDevelopmentTask(input: {
  labels: LabeledInput["labels"];
  comments?: readonly CommentInput[];
}): boolean {
  if (hasRecognizedAutomationStatusLabel(input.labels)) return true;
  if (hasDevelopmentTaskLabel(input.labels)) return true;
  if (input.comments && hasTaskAreaMarker(input.comments)) return true;
  return false;
}
