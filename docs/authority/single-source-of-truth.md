# Single Source of Truth Policy

## Principle

ATTD uses one authoritative source per type of truth. Chat messages and model memory are context, not authority.

## Truth map

| Truth type | Authority |
| --- | --- |
| Business direction and operating principles | `docs/authority` + accepted ADRs |
| Architecture and domain boundaries | `docs/authority` + `docs/decisions` |
| Machine-readable operating configuration | `docs/attd-os.yaml` |
| Customer / lead / quote / order / production runtime data | Production application database and domain services |
| Product / variant truth | Product Platform |
| Pricing calculation | Pricing Engine |
| Software task state | GitHub Issue / PR |
| CI state | GitHub Actions/checks |
| Deployment state | Vercel production deployment metadata |
| Production verification | Production runtime + explicit smoke/QA evidence |
| Historical decisions | ADRs and linked GitHub issues |

## Conflict resolution

When two sources disagree:

1. Runtime/system-of-record state beats conversation memory.
2. Current accepted ADR/authority beats old task prose.
3. Current GitHub/Vercel/CI state beats manually copied status text.
4. Explicit domain service/database truth beats duplicated UI state.
5. If two authoritative sources still conflict, mark the result `UNKNOWN / NEEDS_RECONCILIATION` rather than guessing.

## Required behavior for agents

Agents MUST:
- identify the authoritative source before changing important behavior;
- verify current state for deployment, CI, runtime, pricing, customer and order claims;
- reuse the canonical domain owner instead of creating duplicate state;
- record durable decisions in an ADR;
- state uncertainty when evidence is incomplete.

Agents MUST NOT:
- report "production" because a PR merged;
- implement pricing formulas inside Quick Quote, Quote UI or Order UI;
- create a second customer/product/order source of truth for convenience;
- use chat memory as proof of task completion;
- silently overwrite a newer accepted decision with an older specification.

## Snapshot versus authority

Some downstream records must preserve historical snapshots. Example: a Quote or Order may store price/customer/item snapshots for auditability.

A snapshot is historical evidence. It does not become the owner of the underlying master data or calculation rules.

## Completion semantics

A software task is not complete until its required gates are satisfied.

Typical delivery completion:
- PR exists and matches task scope;
- CI passes;
- reviewer blocking findings are cleared;
- merged;
- production deployment verified;
- required smoke/QA passes;
- task/Control Plane updated.

If a required gate cannot be verified, status must remain incomplete or unknown.
