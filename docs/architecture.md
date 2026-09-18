# ATTD Architecture Guardrails

## Purpose
This document defines the minimum architectural guardrails for humans and coding agents working on ATTD Business OS.

## Core architecture
- Next.js App Router provides the web/admin application and server endpoints.
- Prisma is the application data-access layer.
- Neon PostgreSQL is the system-of-record database.
- Vercel hosts preview and production deployments.
- GitHub is the source-control and pull-request gate.

## Business domains
Prefer extending existing domains rather than introducing parallel concepts:
- CRM: leads, customers, contacts, activities, opportunities.
- Pricing: price groups, price tiers, service rules, calculations and costing.
- Quotation: quotes, quote items, customer snapshots and public quote views.
- Orders: accepted commercial work and customer commitments.
- Production: item-level production tracking, stages, batches, issues and suppliers.
- Payments/banking: transaction ingestion, matching, reconciliation and audit history.
- Content/product platform: products, variants, categories, media and public website.

## Design rules
1. A domain rule should have one authoritative implementation.
2. UI components should orchestrate presentation, not replicate server business rules.
3. Financial state changes must be explicit and auditable.
4. External integrations should enter through adapters/webhooks and call domain logic.
5. Automation tools may orchestrate workflows but should not become the source of truth.
6. Production credentials must not be available to coding/test agents.

## Deployment model
- `main` represents production-ready code.
- Every change should be developed on a branch and proposed through a pull request.
- Pull requests must pass CI before merge.
- Vercel Preview is the preferred place for manual acceptance testing.
- High-risk changes require explicit human approval.
