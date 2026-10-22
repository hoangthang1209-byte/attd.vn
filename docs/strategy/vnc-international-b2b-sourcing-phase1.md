# VNC International B2B Sourcing — Phase 1 (22 Oct 2026)

## Guardrails
- B2B only: sourcing, product development, OEM, QC, delivery. No D2C, fan retail, marketplace, IP licensing, or artist management.
- Protect AXXEL and VieIP relationships. Do not solicit upstream customers using confidential order details.
- No edits to production domain, deployment settings, database, or public code in this phase. Work in review-only branches until QA.
- Describe factory ownership honestly; VNC coordinates an external manufacturing network and manages production/QC.

## Evidence / audit
- VNC OS repo: hoangthang1209-byte/vnc-os; main at 67a71c357139b11e4b623afdb5ea0a46abbc8048 on Oct 22.
- Schema: prisma/schema.prisma holds Product, variants and DealerRFQItem relationship; feature-level review remains necessary.
- Public lead endpoint src/app/api/leads/route.ts: creates CONTACT or PRODUCT_INQUIRY CRM leads; has rate limit, deduplication and source detail.
- Commit #225 creates POST /api/integrations/vnc/leads, shared-secret server-to-server lead bridge, tagged WEBSITE_VIETNAMCLOTHING. Existence of OS endpoint **does not** prove website integration is deployed or configured.
- Commit #224 adds lead filter by originating website. Live DB end-to-end submission not yet tested.
- Public live website at www.vietnamclothing.vn currently emphasizes factory/manufacturing, long product lists, OEM; sourcing positioning and explicit RFQ journey need improvement.
- GitHub vietnam-clothing-v2 main latest observed commit dated May 27 2026, whereas www site may be on other deployment/repo. DO NOT assume repo is live until Vercel mappings verified.
- Vercel get_project team scope currently returns 403; authorization required. Do not change any config.

## Commercial positioning (draft)
Vietnam Clothing — International Apparel & Merchandise Sourcing Partner.
We coordinate product development, fabric and trim sourcing, manufacturing, quality control and delivery in Vietnam for brands, importers, promotional product distributors and merchandise agencies.
We serve B2B buyers through sampling, MOQ-based quotations and production plans. No retail.

Hero:
**Reliable Sourcing. Controlled Production. Delivered from Vietnam.**
From tech pack to finished goods, one Vietnam-based team manages samples, supplier selection, manufacturing, inspections and shipment coordination.
CTA: Request a Sourcing Quote | Explore Capabilities.

Core pages: /sourcing, /apparel-oem, /merchandise-sourcing, /caps-bags-accessories, /quality-control, /request-quote.
Do not publish logos/names of entertainment projects absent written clearance.

## RFQ minimal data contract
Company; buyer name; business email; country; product category; style count; quantity per style/color; target delivery date; destination; tech pack/assets; material/GSM; decoration; packaging; trade term; remarks; data processing consent.
Required to make lead: company/name plus email/phone. Do not send private artwork over unsecured public links.
CRM pipeline: New -> Qualified -> RFQ Received -> Costing -> Quote Sent -> Sample -> Negotiation -> PO -> Won/Lost.
Tag acquisition source (VNC website, outbound, referral), business segment, market, lead owner, next action, loss reason.
Deduplicate by company/domain/contact; secure uploads; structured handoff to costing/quote/order.

## 100-account prospecting plan (target, not verified list)
- 30 overseas merchandise sourcing or promotional products agencies (Singapore 10, US 10, Australia 10).
- 25 apparel importers/wholesalers (US 10, Australia 10, EU 5).
- 20 corporate merchandising / promotional distributors (Singapore 8, Australia 6, US 6).
- 15 private-label apparel brands with established buying teams (US 5, Australia 5, EU 5).
- 10 entertainment merchandise production agencies not overlapping protected partner relationships (US 4, Singapore 3, Australia 3).
Minimum research for each: company domain, country, evidence of B2B sourcing need, buyer role, relevant product lines, vendor onboarding route, conflict check, last-checked date, outreach status. Do not invent contact emails.
Score /100: buying fit 30, repeat potential 20, order scale 15, supply fit 15, accessible procurement contact 10, payment/risk 10.
Weekly test: 20 researched prospects, 10 tailored contacts, follow-up in 5–7 business days. Respect opt-outs and regional outreach requirements.

## Execution tasks / gates
P0: Verify website actual Git repo and Vercel project mapping (403 requires authorization); compare legacy site and new frontend before any routing.
P0: Audit CRM schema, leads UI, quote/RFQ linkage and website lead bridge end-to-end in staging; check validation, auth, rate limits, idempotency, attribution.
P0: Build RFQ intake spec and conversion tracking; no live-form modification until dry-run and rollback plan.
P1: Build 10-slide capability profile, only verifiable claims, no confidential clients/logos.
P1: Prospecting CRM setup and first 20 verified account dossiers (begin from agency/importer).
P1: Landing pages copy and IA in draft; stage/preview only.
QA gate: production and preview domain separation, accessibility, mobile 393x852, contact submission synthetic test, no leakage of leads/private data.
Decision gate: approve deploy only after verified project mapping, tests and staging smoke checks.

## Success measures in first 90 days (targets, not outcomes)
100 verified target accounts; 40–60 relevant contacts; 10 qualified buyer conversations; 3–5 substantive RFQs; first new direct overseas PO is stretch.
Measure quote turnaround, margin, owner follow-up timeliness and on-time delivery.

## Current blockers
Vercel team access 403. Website source-to-live mapping unresolved. No verified company-level international prospects entered yet. Existing RFQ UI and live lead receipt not proven by code inspection alone.
