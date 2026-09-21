import type { AutomationTask, AutomationTaskRelationship } from "@/features/automation/automation-task.types";

const ISSUE_REFERENCE_PATTERN =
  /(?:supersedes|superseded by|repair for|fixes|fixed by|closes|closed by)\s+#(\d+)/gi;

export function extractLinkedIssueReferences(text: string): number[] {
  const matches = [...text.matchAll(ISSUE_REFERENCE_PATTERN)];
  const numbers = matches
    .map((match) => Number.parseInt(match[1] ?? "", 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  return [...new Set(numbers)];
}

export function buildTaskRelationshipMap(tasks: AutomationTask[]): Map<number, AutomationTaskRelationship> {
  const byNumber = new Map(tasks.map((task) => [task.issueNumber, task]));
  const relationships = new Map<number, AutomationTaskRelationship>();

  for (const task of tasks) {
    const references = new Set<number>();

    for (const comment of task.recentStatusComments) {
      for (const number of extractLinkedIssueReferences(comment.body)) {
        references.add(number);
      }
    }

    for (const number of extractLinkedIssueReferences(task.title)) {
      references.add(number);
    }

    const supersedes = [...references].filter((number) => number !== task.issueNumber);
    relationships.set(task.issueNumber, {
      supersedesIssueNumbers: supersedes,
      supersededByIssueNumber: null,
      repairForIssueNumber: findRepairTarget(task, supersedes),
      isSupersededInActiveView: false,
      groupKey: null,
    });
  }

  for (const [issueNumber, relationship] of relationships) {
    for (const supersededNumber of relationship.supersedesIssueNumbers) {
      const target = relationships.get(supersededNumber);
      if (!target) continue;
      if (!target.supersededByIssueNumber || target.supersededByIssueNumber < issueNumber) {
        target.supersededByIssueNumber = issueNumber;
      }
    }
  }

  for (const [issueNumber, relationship] of relationships) {
    const task = byNumber.get(issueNumber);
    if (!task) continue;

    const supersededBy = relationship.supersededByIssueNumber;
    const supersedingTask = supersededBy ? byNumber.get(supersededBy) : null;
    const shouldHideInActive =
      Boolean(supersedingTask?.isOpen) &&
      task.isOpen &&
      !["merged", "superseded", "failed"].includes(task.status);

    relationships.set(issueNumber, {
      ...relationship,
      isSupersededInActiveView: shouldHideInActive,
      groupKey: supersededBy ? `superseded-by-${supersededBy}` : `issue-${issueNumber}`,
    });
  }

  return relationships;
}

function findRepairTarget(task: AutomationTask, references: number[]): number | null {
  for (const comment of task.recentStatusComments) {
    const repairMatch = comment.body.match(/repair for\s+#(\d+)/i);
    if (repairMatch?.[1]) {
      return Number.parseInt(repairMatch[1], 10);
    }
  }

  if (task.labels.some((label) => label.startsWith("orchestrator:"))) {
    return references[0] ?? null;
  }

  return null;
}

export function applyTaskRelationships(tasks: AutomationTask[]): AutomationTask[] {
  const relationshipMap = buildTaskRelationshipMap(tasks);

  return tasks.map((task) => ({
    ...task,
    relationship: relationshipMap.get(task.issueNumber) ?? {
      supersedesIssueNumbers: [],
      supersededByIssueNumber: null,
      repairForIssueNumber: null,
      isSupersededInActiveView: false,
      groupKey: `issue-${task.issueNumber}`,
    },
  }));
}

export function filterActiveViewTasks(tasks: AutomationTask[]): AutomationTask[] {
  return tasks.filter((task) => !task.relationship?.isSupersededInActiveView);
}
