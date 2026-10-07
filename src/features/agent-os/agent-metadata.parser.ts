import { isKnownAgentId, normalizeAgentId } from "@/features/agent-os/agent-registry";
import type { AgentTaskPriority, ParsedAgentIssueMetadata } from "@/features/agent-os/agent.types";

const METADATA_LINE_PATTERN =
  /^ATTD_(AGENT|AREA|PRIORITY|PARENT_TASK):\s*(.*)$/i;

const PRIORITY_VALUES = new Set<AgentTaskPriority>(["P0", "P1", "P2", "P3"]);

const PARENT_TASK_PATTERN = /^#?(\d+)\s*$/;

export type AgentMetadataSource = {
  body: string | null | undefined;
  comments?: readonly { body: string }[];
};

function normalizePriority(raw: string): AgentTaskPriority | null {
  const upper = raw.trim().toUpperCase();
  if (PRIORITY_VALUES.has(upper as AgentTaskPriority)) {
    return upper as AgentTaskPriority;
  }
  return null;
}

function parseParentTask(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(PARENT_TASK_PATTERN);
  if (!match) return null;
  const issueNumber = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) return null;
  return issueNumber;
}

function applyMetadataLine(
  accumulator: ParsedAgentIssueMetadata,
  key: string,
  value: string,
): ParsedAgentIssueMetadata {
  const normalizedKey = key.toUpperCase();
  switch (normalizedKey) {
    case "AGENT": {
      const rawOverride = value.trim();
      if (!rawOverride) {
        return { ...accumulator, agentOverride: null, agentOverrideValid: false };
      }
      const agentOverride = normalizeAgentId(rawOverride);
      const valid = isKnownAgentId(agentOverride);
      return {
        ...accumulator,
        agentOverride: valid ? agentOverride : rawOverride,
        agentOverrideValid: valid,
      };
    }
    case "AREA": {
      const taskAreaOverride = value.trim();
      return {
        ...accumulator,
        taskAreaOverride: taskAreaOverride || null,
      };
    }
    case "PRIORITY": {
      return {
        ...accumulator,
        priority: normalizePriority(value),
      };
    }
    case "PARENT_TASK": {
      return {
        ...accumulator,
        parentTaskIssueNumber: parseParentTask(value),
      };
    }
    default:
      return accumulator;
  }
}

function scanTextForMetadata(
  text: string,
  accumulator: ParsedAgentIssueMetadata,
): ParsedAgentIssueMetadata {
  let next = accumulator;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(METADATA_LINE_PATTERN);
    if (!match) continue;
    next = applyMetadataLine(next, match[1] ?? "", match[2] ?? "");
  }
  return next;
}

const EMPTY_METADATA: ParsedAgentIssueMetadata = {
  agentOverride: null,
  agentOverrideValid: false,
  taskAreaOverride: null,
  priority: null,
  parentTaskIssueNumber: null,
};

/**
 * Conservative parser for ATTD_* issue metadata.
 * Scans issue body first, then comments in order; later lines override earlier ones.
 */
export function parseAgentIssueMetadata(source: AgentMetadataSource): ParsedAgentIssueMetadata {
  let metadata = { ...EMPTY_METADATA };

  if (source.body) {
    metadata = scanTextForMetadata(source.body, metadata);
  }

  if (source.comments) {
    for (const comment of source.comments) {
      metadata = scanTextForMetadata(comment.body, metadata);
    }
  }

  return metadata;
}
