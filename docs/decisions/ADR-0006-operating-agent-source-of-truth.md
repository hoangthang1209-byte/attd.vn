# ADR-0006: Operating Agent and Single Source of Truth

## Status

Accepted

## Date

2026-10-08

## Context

ATTD.vn is operated through multiple specialist chats/agents and multiple business domains. Without a shared source-of-truth hierarchy, different agents can make conflicting assumptions about architecture, pricing ownership, task completion and production state.

## Decision

ATTD adopts an **Operating Agent** as the top-level governor for cross-domain prioritization, delegation, verification and escalation.

All agents must bootstrap from the repository authority documents and `docs/attd-os.yaml`.

Conversation memory is explicitly non-authoritative.

Authoritative truth is separated by domain:
- authority/ADRs for business and architecture decisions;
- production database/domain services for runtime business state;
- Product Platform for product truth;
- Pricing Engine for pricing logic;
- GitHub for software task and PR state;
- GitHub checks/Actions for CI;
- Vercel for deployment state;
- production runtime + QA evidence for production verification.

`/admin/automation` is the Control Plane for software/automation lifecycle and will extend issue #89 rather than create a parallel lifecycle system.

## Consequences

- Specialist agents remain independent workers but cannot invent their own system truth.
- Production completion requires evidence, not conversation claims.
- Cross-domain work is prioritized by the Operating Agent.
- Durable decisions are recorded as ADRs.
- Conflicting evidence must surface as unknown/reconciliation-needed rather than be guessed.
- Existing domain boundaries remain in force.

## Related

- ADR-0001 Architecture Authority
- ADR-0003 Domain Boundaries
- GitHub issue #89 Automation Control Center V2
- GitHub issue #177 ATTD Operating Agent + Single Source of Truth Control Plane
