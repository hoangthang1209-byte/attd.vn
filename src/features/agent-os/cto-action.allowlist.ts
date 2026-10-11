/** Typed allowlist for G3 CTO loop actions — no unrestricted side effects. */
export const CTO_ALLOWED_ACTIONS = [
  "ASSIGN_AGENT",
  "WAIT_EXTERNAL",
  "WAIT_HUMAN",
  "POST_BUILD_APPROVED",
  "REQUEST_CI_RETRY",
  "RECORD_DECISION",
  "ADVANCE_AFTER_VERIFIED_STATE",
  "ESCALATE_NO_PROGRESS",
  "ESCALATE_HIGH_RISK",
  "NOOP",
] as const;

export type CtoAllowedAction = (typeof CTO_ALLOWED_ACTIONS)[number];

const ACTION_SET = new Set<string>(CTO_ALLOWED_ACTIONS);

export function isCtoAllowedAction(value: string): value is CtoAllowedAction {
  return ACTION_SET.has(value);
}

export function assertCtoAllowedAction(value: string): CtoAllowedAction {
  if (!isCtoAllowedAction(value)) {
    throw new Error(`Unsupported CTO action: ${value}`);
  }
  return value;
}

/** Actions that may perform external GitHub writes (still gated by factory authorization). */
export const CTO_EXTERNAL_WRITE_ACTIONS = new Set<CtoAllowedAction>([
  "POST_BUILD_APPROVED",
  "REQUEST_CI_RETRY",
]);

export function isCtoExternalWriteAction(action: CtoAllowedAction): boolean {
  return CTO_EXTERNAL_WRITE_ACTIONS.has(action);
}
