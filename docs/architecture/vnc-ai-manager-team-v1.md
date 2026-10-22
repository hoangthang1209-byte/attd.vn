# VNC AI Manager Team — architecture v1
Status: DRAFT / DESIGN ONLY. Does not activate agents or change production.
Date: 2026-10-22

## Strategy / exclusions
VNC is an international B2B sourcing and manufacturing partner. No retail, consumer marketplace, artist management, IP ownership or D2C. Respect all AXXEL, VieIP and customer confidentiality.

## Operating model
One AI Chief of Staff (orchestrator) and seven domain AI Manager roles:
1. SALES: B2B prospect research, CRM, RFQ qualification, follow-up recommendations; KPI verified accounts / conversations / RFQs / POs.
2. SOURCING: supplier registry, quotes, capacity, sourcing alternatives; KPI supplier reliability, landed cost, MOQ, response times.
3. PRODUCT: tech packs, BOM, sampling, size sets, approval gates; KPI sample turnaround, revision cycles.
4. PRODUCTION: plan, milestones, WIP tracking, QC, packing, delivery; KPI OTIF, defect, schedule risk; baseline complex orders at 30–40 days bulk, not historic 20-day rush.
5. FINANCE: costing, margins, deposits, receivables, profitability; KPI contribution margin, working-capital exposure, overdue invoices.
6. MARKETING: B2B pages, SEO, capability profile, inbound lead attribution; KPI qualified inbound leads.
7. TECHNOLOGY: GitHub PR/CI, Vercel staging, OS integrations, observability; KPI deployment reliability, incidents, lead intake integrity.
AI CHIEF OF STAFF: goal decomposition, dependency planning, daily priorities, reconciled scorecard, escalation to human CEO, cross-manager conflict resolution.

## Source of truth
Single VNC OS database for customer, company, contact, lead, opportunity/RFQ, quote, sample, PO, item/SKU, material, supplier quote, production job, QC, shipment, invoice and profitability.
Agents MUST NOT maintain conflicting shadow copies of task status in separate chats.
Unified work item minimum fields:
id, business_domain, title, objective, entity_type, entity_id, owner_agent, human_owner,
priority, status, input_refs, output_refs, acceptance_criteria, dependencies,
due_at, approval_required, risk_level, last_run_at, next_run_at, last_error,
attempt_count, trace_id, created_at, updated_at.
Task statuses: INBOX, READY, RUNNING, BLOCKED, REVIEW, APPROVED, DONE, FAILED, CANCELED.
An owner agent is responsible for outcome, may delegate tasks, and must write back evidence.

## Orchestration protocol
Event-driven workflows via durable queue/DB-backed jobs, not a chat session pretending to run continuously.
Triggers: website lead, inbound RFQ, quote request, PO, sample approval, supplier update, production milestone, aging invoice, GitHub PR/CI, scheduled brief.
AI CEO plans DAG of tasks; domain manager returns structured output + evidence + risk/confidence.
Every task has idempotency key, lease/heartbeat, retry with exponential backoff, dead-letter escalation and immutable event log.
No auto-merge of stale PR head, no production deployment without exact commit CI/review gate.
Run budget, token ceilings, concurrency and rate limits per agent. Pause on repeated failures instead of endless loops.

## Example RFQ workflow
1. WEBSITE -> CRM: authenticated, deduplicated incoming lead; assign sales agent.
2. SALES: qualify buyer identity, delivery market, tech pack, MOQ/quantity, timeline.
3. PRODUCT: feasibility, BOM and sample need.
4. SOURCING: supplier shortlist, quote assumptions and sourcing lead time.
5. PRODUCTION: factory schedule, QC/logistics feasibility.
6. FINANCE: validate margin, deposit and exposure, advise price range.
7. SALES: prepare quote DRAFT, attach assumptions, present to human account owner.
8. AI CEO: verify mandatory approvals, dependency closure and next actions.
9. Upon human-approved PO: handoff to production and finance.
All quotes sent to external recipients only on authorized send action, never by autonomous default.

## Approval policy
AUTO: read-only research, internal draft documents, task classification, duplicate checks, internal risk notifications, non-destructive data validation.
REVIEW: customer quotation, promised lead time, supplier selection for high-value/risky work, publication, contractual text.
HUMAN-ONLY (until explicitly expanded): legal commitments, PO acceptance, large expenditures, payment, bank data changes, customer-facing bulk outreach, access grant, merge/deploy production, destructive database actions.
Require role-based least privilege and tenant/client isolation. Sensitive pricing, supplier and customer documents permissioned; no cross-account leakage.

## VNC OS screen
/admin/ai-team — global scorecard and status grid (CEO + seven managers).
/admin/ai-team/agents/[id] — objective, KPIs, assigned tasks, decisions, evidence, run history, failures, budget.
/admin/ai-team/work — unified queue with owner, priority, due, dependency, entity links.
/admin/ai-team/approvals — human decision gate.
/admin/ai-team/events — immutable audit timeline.
/admin/ai-team/settings — schedules, tool permissions, budgets.
Add within current admin navigation, no second isolated dashboard.

## First sprint acceptance criteria
- Manager registry seeds CEO + 7 roles with exact responsibility and allowed tools.
- Demonstrate end-to-end TEST lead -> assign SALES -> draft RFQ -> ask PRODUCT/SOURCING/PRODUCTION/FINANCE -> human review, with events and trace.
- Prove double intake is deduplicated.
- Show manager dependency graph and blocked status.
- Stuck job recovery and alert without duplication.
- Unauthorized agent cannot contact customer, send emails, alter PO or deploy production.
- Tests pass on isolated DB; desktop + 393x852 mobile QA in preview.
- No change to website production or live domain without explicit gate.

## Audit preliminary
VNC OS repo main showed recent commits #210/#211 for reviewer/watchdog orchestration and #224/#225 for CRM lead intake. This is evidence of existing primitives, not proof these business agents are implemented.
Before implementation verify actual automation codepaths, migrations, auth, tests, and team ownership; avoid rebuilding existing lanes.
Dependencies: Vercel team project access previously returned 403; stage-only workflow must not assume access.
