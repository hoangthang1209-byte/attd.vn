# VNC AI Management Team — Agent OS integration plan

Status: IMPLEMENTATION FOUNDATION
Date: 2026-10-22
Canonical direction: extend the existing Agent OS. Do not create a second Agent OS.

## Strategic scope

VNC operates as an International Apparel & Merchandise Sourcing Partner focused on:
- International B2B Sourcing
- Apparel OEM & Private Label
- Entertainment Merchandise Sourcing
- Corporate Uniforms & Workwear
- Promotional Products & Corporate Gifts

Explicitly excluded: retail, D2C, marketplace, creator commerce, artist/IP ownership.

## Audit of current Agent OS

### Reuse as-is
- Prisma persistence exists for AgentRun, TaskRun, AgentEvent and AgentDecision.
- Migration 0099_agent_os_g2_persistence exists.
- Agent run service supports idempotent create, event ingestion, serializable updates, retry chain and decision records.
- Agent run state machine exists.
- Existing technical agent registry/router exists.
- /admin/automation exists and has GitHub task control plus AgentRun history panel.
- Reviewer/watchdog orchestration from #211 is on main.
- CRM Lead, SalesOpportunity, PricingCalculation, Quote, TechPack, suppliers, production planning and Order models already exist.
- Authenticated vietnamclothing.vn lead intake bridge exists and deduplicates inbound leads.

### Reuse but extend
- Existing eight software-factory agents become delegated technical workers under TECHNOLOGY_MANAGER.
- AgentRun/TaskRun remains the execution/history primitive, but business work needs richer entity/dependency/lease metadata.
- /admin/automation remains the operational control center and should gain a business-management view rather than a separate isolated OS.
- CRM/Quote/Pricing/Production models remain canonical business entities; AI workflows reference them instead of creating shadow copies.

### Missing before business agents can operate unattended
1. Unified business work item with entity type/id, owner manager, human owner, dependency edges, due time, approval mode, lease/heartbeat, retry/dead-letter and evidence refs.
2. Business event sources: website RFQ, lead qualified, sample approval, supplier response, quote approval, PO approval, production milestone, invoice aging.
3. Durable DB-backed reconciler/dispatcher for business tasks; GitHub Actions remains Technology Manager's factory scheduler, not the scheduler for all departments.
4. Approval queue with explicit human actor/action/evidence.
5. Business agent permission/tool policy enforcement.
6. Structured manager outputs for RFQ qualification, BOM/technical analysis, sourcing assessment, production feasibility, finance commercial review and quotation draft.
7. Business KPI snapshots and daily/weekly scorecard.
8. Dashboard management view: 8 managers, work queue, dependencies, blockers, approvals, retries, KPI and business outcome.
9. End-to-end RFQ orchestration wired to real VNC OS entities and AgentRun/TaskRun.
10. Business watchdog/recovery tests proving no duplicate execution and no silent stuck tasks.

## Hierarchy

AI Chief of Staff owns enterprise goal decomposition and cross-manager coordination.

Managers:
- SALES_MANAGER
- SOURCING_MANAGER
- PRODUCT_MANAGER
- PRODUCTION_MANAGER
- FINANCE_MANAGER
- MARKETING_MANAGER
- TECHNOLOGY_MANAGER

Technology Manager delegates engineering work to the current technical Agent OS worker registry:
ATTD_CTO, CRM_AGENT, PRICING_QUOTATION_AGENT, PUBLIC_WEBSITE_AGENT, SEO_AGENT, QA_AGENT, DEPLOYMENT_AGENT and RELIABILITY_AGENT.

## First business workflow: International B2B RFQ -> Quotation

Canonical DAG:
1. SALES_MANAGER qualify lead/RFQ.
2. PRODUCT_MANAGER analyze technical requirements and BOM.
3. SOURCING_MANAGER validate suppliers, MOQ, material and cost assumptions.
4. PRODUCTION_MANAGER validate capacity, schedule, QC, packing and delivery feasibility.
5. FINANCE_MANAGER review cost, margin and payment exposure.
6. SALES_MANAGER assemble quotation DRAFT only.
7. CHIEF_OF_STAFF validate dependency closure and create approval packet.
8. Human owner approves external quotation send.
9. Approved PO triggers production + finance handoff.

No autonomous customer quotation send, PO acceptance, payment or production deploy.

## Sprint backlog

### Sprint 0 — Agent OS core closeout (P0)
Dependency: PR #219.
Acceptance:
- reviewer eligibility works for low/medium risk;
- exact-head review request/retry works;
- no invalid gh --jq --arg helper paths;
- expected-head merge gate;
- exact production SHA verification;
- stale-builder recovery;
- end-to-end factory smoke without chat dependency.

### Sprint 1 — Management foundation (P0)
Dependency: Sprint 0 for autonomous runtime; code contracts can be prepared in parallel.
Deliver:
- management team registry and hierarchy;
- Technology Manager -> technical worker mapping;
- RFQ workflow DAG + dependency evaluator;
- unified work-item schema design and migration;
- business event source enum expansion;
- approval policy contracts.
Acceptance:
- exactly 1 Chief of Staff + 7 managers;
- no duplicate technical Agent OS;
- RFQ DAG tests;
- permission tests prohibit external send/payment/prod deploy.

### Sprint 2 — Sales + Sourcing execution (P0)
Dependencies: Sprint 1.
Deliver:
- website lead event -> AgentRun/WorkItem;
- Sales qualification output;
- opportunity creation/linking;
- Sourcing assessment using canonical supplier/material/cost sources;
- deduplicated intake and idempotent task creation.
Acceptance:
- duplicate website intake creates no duplicate business workflow;
- qualification + sourcing outputs persisted with evidence;
- blocked/missing data visible in VNC OS.

### Sprint 3 — Product + Production + Finance RFQ checks (P1)
Dependencies: Sprint 2.
Deliver:
- technical/BOM analysis contract;
- production feasibility;
- commercial review;
- parallel dependency fan-out/fan-in.
Acceptance:
- quote drafting cannot begin until mandatory dependencies complete;
- margin/payment-risk checks require human review where configured.

### Sprint 4 — Quotation approval handoff (P1)
Dependencies: Sprint 3.
Deliver:
- Sales quotation draft generated from canonical Quote/Pricing models;
- Chief of Staff approval packet;
- human approval action;
- immutable decision/event history.
Acceptance:
- no external quote send before authorization;
- quote links back to RFQ/opportunity and all manager evidence.

### Sprint 5 — Management dashboard (P1)
Dependencies: Sprints 1-4.
Deliver inside /admin/automation:
- 8-manager scorecard;
- current work/KPI/blocker/retry/dependency;
- approvals;
- daily/weekly business result summaries;
- business-friendly labels.
Acceptance:
- desktop + 393x852 mobile QA;
- technical detail available on drill-down, not forced into executive overview.

### Sprint 6 — PO -> Production + Finance handoff (P1)
Dependencies: Sprint 4.
Deliver:
- approved PO event;
- production work package;
- finance receivable/cash-flow tasks;
- milestone watchdog.
Acceptance:
- no PO acceptance without human authorization;
- production and finance tasks trace back to PO/quote/RFQ.

## Release policy

All implementation uses branch/PR -> CI -> review -> preview/staging QA -> merge -> exact production verification.
No domain, production DB, secrets, pricing rules, payment flow, auth or destructive migration changes without the relevant human gate.
