# CTO-2 Source Code Boundary Audit

Date: 2026-07-05
Status: Completed audit
Scope: Documentation and roadmap only

## Executive Summary

ATTD.vn is already moving toward the Operating Model v1.0 boundaries: the App Router is separated into public, admin, document, B2B portal, and API route groups; many newer modules have `src/features/[module]` service layers; and CTO-1 centralized admin IA in `src/lib/admin/admin-navigation.ts`.

The main boundary risks are transitional rather than structural failure:

- Some legacy admin pages still contain data access, formatting, and table UI inline.
- API response shapes vary across old and new modules.
- Permission enforcement exists in middleware and route handlers, but route-level consistency needs a dedicated verification sprint.
- `src/lib` still contains several module-like content and manufacturing helpers that should eventually move behind platform-owned services.
- Old route aliases remain necessary for compatibility but now need clear ownership labels under Operating Model v1.0.
- Build warnings remain for the deprecated Next.js `middleware` convention and Turbopack/NFT tracing around quote PDF fonts.

This sprint did not refactor source code, rename routes, rename Prisma models, or change business logic.

## Source Inventory

Audited areas:

- `src/app`: route groups for `(public)`, `(backend)/admin`, `(b2b-portal)`, `(document)`, `api`, root assets, and root layout.
- `src/components`: admin, public, marketplace, portal, document, quote, order document, SEO, analytics, and legacy layout components.
- `src/features`: 40+ feature/module folders including CRM, products, pricing, quotes, orders, dealer, manufacturing library, production planning, tech pack, auth, AI, content, and settings.
- `src/lib`: shared auth, admin navigation, API/admin helpers, storage, SEO, Prisma, validation, logging, and legacy public content helpers.
- `prisma`: schema plus migrations `0001` through `0054`, plus `20260609171354_attd_initial_v1`.
- `docs`: authority, engineering, CMS design system, existing ADRs.
- `scripts`: seed, backfill, deployment readiness, and product audit scripts.

Observed counts at audit time:

- API route handlers: 300
- Admin page routes: 136
- Feature files: 460
- Admin component files: 324

Local worktree note: pre-existing unstaged quote/manufacturing-evidence changes were visible locally and intentionally not modified by this audit.

## Operating Model v1.0 Platform Mapping

### CRM Platform

Current source:

- `src/features/crm`
- `src/features/leads`
- `src/components/admin/crm`
- legacy admin components: `src/components/admin/CrmLeadsManager.tsx`, `LeadCRMDrawer.tsx`, `PipelineStatusSelector.tsx`
- shared legacy helper: `src/lib/pipelineStatus.ts`

Current routes/APIs:

- Admin: `/admin/crm`, `/admin/crm/leads`, `/admin/crm/customers`, `/admin/crm/reports`, `/admin/crm/sales`, `/admin/crm/whatsapp-assistant`, legacy `/admin/lead`, `/admin/khach-hang-tiem-nang`
- API: `/api/crm/*`, `/api/leads`, `/api/dealer-leads/*`, `/api/admin/revenue-categories`, `/api/admin/sales`

Current Prisma models/enums:

- `Lead`, `Customer`, `Contact`, `CRMActivity`, `CRMProductInterest`, `LeadNote`
- `LeadSource`, `LeadStatus`, `LeadPriority`, `CustomerType`, `CustomerStatus`, `CRMActivityType`, `LeadPipelineStatus`
- `SalesRepresentative`, `RevenueCategory`

Current gaps:

- Legacy `/admin/khach-hang-tiem-nang` uses direct Prisma access and inline table UI.
- `/api/leads` still mixes public lead capture with CRM lead creation and local parsing.
- Contact/follow-up/sample tracking are not fully represented as first-class sidebar modules.

Ownership boundary:

- Owns lead, customer, contact, activity, follow-up, and sales pipeline behavior.
- Should expose shared lead/customer APIs/services to Commercial and Dealer rather than letting UI pages couple directly.

Dependencies:

- Product interests depend on Product Platform snapshots.
- Quotes and Orders depend on CRM customer/contact snapshots.
- Dealer RFQs may convert into CRM leads.

### Commercial Platform

Current source:

- `src/features/pricing`
- `src/features/quotes`
- `src/features/orders`
- `src/features/revenue-categories`
- `src/features/sales`
- `src/components/admin/pricing`, `src/components/admin/quotes`, `src/components/admin/orders`, `src/components/quotes`, `src/components/orders/documents`

Current routes/APIs:

- Admin: `/admin/pricing/*`, `/admin/quotes/*`, `/admin/orders/*`
- API: `/api/pricing/*`, `/api/quotes/*`, `/api/orders/*`, `/api/admin/sales/*`, `/api/admin/revenue-categories/*`
- Public/document: `/q/[token]`, `/quote-link/[quoteLink]`, `/q/[token]/document`, `/o/[orderNo]/[docType]`

Current Prisma models/enums:

- Pricing: `PriceGroup`, `ProductPriceTier`, `ServicePriceRule`, `PricingCalculation`, `PricingCalculationItem`
- Quotes: `Quote`, `QuoteItem`, `QuoteStatus`, `QuoteSourceType`, `QuotePriceVatType`
- Orders: `Order`, `OrderItem`, `OrderItemVariant`, `OrderPayment`, `OrderActivity`, `RevenueCategory`
- Delivery/completion: `DeliveryMethod`, `DeliveryCarrier`, `OrderDeliveryExecution`, `OrderDeliveryAttempt`, `OrderDeliveryProof`
- Enums include `OrderStatus`, `OrderPaymentType`, `OrderPaymentMethod`, `OrderPaymentStatus`, `OrderActivityType`, `DeliveryExecutionStatus`, `DeliveryAttemptResult`, `DeliveryProofType`

Current gaps:

- API response shape is inconsistent across pricing, quote, and order handlers.
- Some route handlers still parse request bodies inline.
- Payment, invoice, margin, and commission are not yet complete first-class modules.
- Quote manufacturing evidence changes are visible locally as unstaged work and should be reviewed in their own sprint before merging with platform boundaries.

Ownership boundary:

- Owns pricing, quote, order, payment, delivery execution, quote public links, and customer-facing commercial document behavior.
- Should consume CRM snapshots and Product/Manufacturing readiness through services.

Dependencies:

- CRM for customers/contacts/leads.
- Product Platform for SKUs and variants.
- Manufacturing and Tech Pack for BOM/readiness/evidence.
- Operations for employee assignment and delivery execution.

### Product Platform

Current source:

- `src/features/products`, `src/features/categories`, `src/features/variants`, `src/features/colors`, `src/features/sizes`
- `src/components/admin/products`
- legacy admin components: `src/components/admin/product-form.tsx`, `category-form.tsx`, `ProductAdminTable.tsx`, `ProductEditForm.tsx`
- public/marketplace components under `src/components/marketplace`, `src/components/public`
- public content helpers in `src/lib/productCatalog.ts`, `productImages.ts`, `productVariants.ts`, `marketplaceCategoryTree.ts`, etc.

Current routes/APIs:

- Admin: `/admin/products`, `/admin/products/new`, `/admin/products/import`, `/admin/products/categories`, `/admin/products/attributes`, `/admin/danh-muc`, `/admin/san-pham/*`, `/admin/variant`, `/admin/attributes`
- API: `/api/admin/products/*`, `/api/products/*`, `/api/categories`, `/api/variants`, `/api/colors`, `/api/images`
- Public: `/san-pham`, `/san-pham/[slug]`, `/[category]`, `/danh-muc-san-pham`, marketplace/SEO routes

Current Prisma models/enums:

- `Product`, `Category`, `ProductVariant`, `ProductImage`, `ProductOption`, `ProductOptionValue`, `ProductVariantOptionValue`, `ProductSpecification`, `ProductCustomizationCapability`
- `ProductAttribute`, `ProductAttributeAssignment`, `ProductAttributeValue`, `ProductAttributeOption`, `ProductImportJob`
- `Color`, `Size`, `ProductStatus`, `StockStatus`, `VariantStatus`, `ProductAttributeType`, `ProductAttributeStatus`, `ProductAttributeDisplayType`, `SharedProductAttributeStatus`, `ProductImportJobStatus`

Current gaps:

- Legacy Vietnamese admin aliases (`/admin/san-pham`, `/admin/danh-muc`) coexist with newer English routes.
- Some public catalog helpers still live in `src/lib` rather than product-owned feature services.
- Product import/export has stronger service boundaries than older product/category pages.

Ownership boundary:

- Owns product catalog, category tree, attributes, SKU/variant lifecycle, import/export, and product publish readiness.
- Public product rendering should consume product-owned read models, not admin service internals.

Dependencies:

- Pricing consumes products and variants.
- Quotes/orders snapshot product data.
- Manufacturing and Tech Pack attach production requirements/evidence.

### Dealer Platform

Current source:

- `src/features/dealer`
- legacy `src/features/dealers`
- `src/components/admin/dealer`
- `src/components/portal`
- `src/lib/dealer-auth`

Current routes/APIs:

- Admin: `/admin/dealer`, `/admin/dealer/rfqs`, legacy `/admin/dai-ly`
- Portal: `/portal`, `/portal/login`, `/portal/rfq`, `/portal/rfq/[id]`, `/portal/pricing`, `/portal/orders`, `/portal/quotes`, `/portal/resources`, `/portal/support`
- API: `/api/dealer/*`, `/api/portal/*`, legacy `/api/dealer-portal/*`, `/api/dealers`

Current Prisma models/enums:

- `Dealer`, `DealerLead`, `DealerCompany`, `DealerUser`, `DealerActivity`, `DealerRFQ`, `DealerRFQItem`
- `DealerStatus`, `DealerLeadStatus`, `DealerCompanyType`, `DealerCompanyStatus`, `DealerLevel`, `DealerUserRole`, `DealerUserStatus`, `DealerActivityType`, `DealerRFQProjectType`, `DealerRFQStatus`, `DealerRFQPriority`, `DealerRFQArtworkStatus`

Current gaps:

- Legacy `Dealer`/`DealerLead` and newer `DealerCompany`/`DealerRFQ` models coexist.
- `/api/dealers` uses direct Prisma and temporary field mapping (`contactName` to `website`, `needs` to `facebook`).
- Legacy `/api/dealer-portal/*` routes are deprecated but still present for compatibility.

Ownership boundary:

- Owns dealer company accounts, dealer users, portal auth, RFQs, dealer activity, and dealer pricing policy surfaces.
- Should integrate with CRM through explicit conversion/services.

Dependencies:

- Pricing for dealer price groups.
- CRM for linked customers/leads.
- Product Platform for RFQ product selections.
- Commercial Platform for converting RFQs into quotes/orders.

### Manufacturing Platform

Current source:

- `src/features/manufacturing-library`
- `src/features/production-master`
- `src/features/materials`
- `src/features/production-planning`
- `src/features/storage`
- `src/components/admin/manufacturing-library`, `production-master`, `materials`, `production-planning`, `operations`
- legacy shared helpers under `src/lib/manufacturing*`

Current routes/APIs:

- Admin: `/admin/manufacturing-library/*`, `/admin/production/*`, `/admin/production-materials/*`, `/admin/production-suppliers/*`, `/admin/trims/*`, `/admin/print-methods/*`, `/admin/materials/*`, `/admin/material-suppliers/*`, `/admin/purchase-requests/*`
- API: `/api/admin/manufacturing-library/*`, `/api/production/*`, `/api/production-materials/*`, `/api/production-trims/*`, `/api/production-suppliers/*`, `/api/print-methods/*`, `/api/materials/*`, `/api/material-suppliers/*`, `/api/purchase-requests/*`, `/api/production-files/*`

Current Prisma models/enums:

- Manufacturing library: `ManufacturingAsset`, `ManufacturingCategory`, `ManufacturingDisplayLocation`, `ManufacturingAssetDisplayLocation`, `ManufacturingMedia`, `ManufacturingTag`, `ManufacturingAssetTag`, `ManufacturingRelation`, `ManufacturingWorkflowTemplate`, `ManufacturingWorkflowStep`, `ManufacturingAssetWorkflow`
- Materials/master data: `Material`, `MaterialWarehouseBalance`, `MaterialStockAdjustment`, `MaterialSupplier`, `MaterialSupplierLink`, `ProductionSupplier`, `ProductionMaterial`, `ProductionTrim`, `PrintMethod`
- Production execution: `ProductionPlan`, `OrderProductionStage`, `OrderProductionFile`, `OrderQcInspection`, `OrderQcEvidence`, `OrderMaterialAllocation`, `PurchaseRequest`, `PurchaseRequestItem`
- Many related production/material/QC enums.

Current gaps:

- Manufacturing, materials, production planning, and production master data are split across several feature folders; that is reasonable but needs platform-level ownership docs.
- Some shared manufacturing helpers in `src/lib` should be reviewed for migration into platform-owned services.
- Cost Library currently maps mostly to Pricing service rules, so ownership between Manufacturing and Commercial should be explicit.

Ownership boundary:

- Owns manufacturing capabilities, evidence library, production master data, materials, suppliers, warehouse readiness, production execution, QC, and production files.
- Should provide readiness/evidence APIs to Commercial and Product without hidden UI coupling.

Dependencies:

- Orders drive production execution.
- Tech Pack provides technical requirements.
- Product provides SKUs/material requirements.
- Storage provides private/public asset handling.

### Tech Pack Platform

Current source:

- `src/features/tech-pack`
- `src/features/patterns`
- `src/features/measurement-template`
- `src/components/admin/tech-pack`, `patterns`, `measurement-template`
- `src/components/tech-pack`

Current routes/APIs:

- Admin: `/admin/tech-pack/*`, `/admin/tech-packs/*`, `/admin/pattern/*`, `/admin/patterns/*`, `/admin/measurement-template/*`, legacy `/admin/rap/*`
- API: `/api/tech-packs/*`, `/api/patterns/*`, `/api/measurement-templates/*`
- Document: `/tech-pack/[id]/document`

Current Prisma models/enums:

- `TechPack`, `TechPackAsset`, `TechPackMeasurement`, `TechPackMeasurementValue`, `Pattern`, `PatternFile`, `PatternMeasurement`, `PatternMeasurementValue`, `TechPackBomItem`, `TechPackArtworkPlacement`, `TechPackReleaseHistory`, `MeasurementTemplate`, `MeasurementTemplateItem`, `MeasurementTemplateValue`
- `TechPackStatus`, `TechPackAssetType`, `TechPackAssetFileType`, `PatternStatus`, `PatternFileType`, `TechPackBomCategory`, `ArtworkPlacementType`, `TechPackReleaseAction`

Current gaps:

- Route aliases (`tech-pack`/`tech-packs`, `pattern`/`patterns`, `rap`) need compatibility documentation.
- BOM touches Product, Manufacturing, Orders, and Production Master Data and needs service-only integration rules.

Ownership boundary:

- Owns technical product specifications, patterns, measurements, BOM, artwork placement, sampling/revision history.
- Should expose released technical data to Manufacturing/Orders through services.

Dependencies:

- Product and variants can be tech-pack sources.
- Manufacturing consumes BOM and production readiness.
- Storage handles private technical assets.

### Content Platform

Current source:

- `src/features/blog`, `posts`, `landing-pages`, `home`, `case-studies`, `client-logos`, `media`, `seo`, `knowledge-base`
- `src/components/admin/blog-editor`, `knowledge-base`, `seo`, settings/homepage forms
- public content components under `src/components/blog`, `home`, `seo`, `public`
- legacy content helpers in `src/lib/siteContent.ts`, `caseStudies.ts`, `clientLogos.ts`, `collectionContent.ts`, `knowledgeContent.ts`

Current routes/APIs:

- Admin: `/admin/blog/*`, `/admin/landing-pages/*`, `/admin/media`, `/admin/case-studies`, `/admin/client-logos`, `/admin/seo-planning`, `/admin/seo/brief-generator`, `/admin/settings/homepage`, legacy `/admin/bai-viet/*`
- API: `/api/blog/*`, `/api/posts/*`, `/api/landing-pages/*`, `/api/media/*`, `/api/case-studies/*`, `/api/client-logos/*`, `/api/admin/seo/brief`, `/api/admin/knowledge-base/*`
- Public: `/blog`, `/blog/[slug]`, landing/SEO pages, homepage

Current Prisma models/enums:

- `Post`, `BlogCategory`, `BlogPost`, `BlogPostCategory`, `MediaAsset`, `ClientLogoRecord`, `CaseStudyRecord`, `HomepageSettings`, `HomepageProofItem`, `HomepageSourcingPathway`, `LandingPageContent`, knowledge-base models
- `PostStatus`, `BlogPostStatus`, `MediaFolder`, `MediaUsageType`, `MediaStorageProvider`, `HomepageProofIcon`, `HomepagePathwaySlot`, knowledge-base enums

Current gaps:

- Blog/content/SEO/AI content generation are tightly adjacent; AI ownership should be separated from content publishing.
- Legacy `/admin/bai-viet` and `src/features/posts` remain as compatibility code.
- Some public content config in `src/lib` should be moved behind content services over time.

Ownership boundary:

- Owns website CMS, blog, landing pages, media library, case studies, client logos, homepage, SEO planning/publishing surfaces.
- AI-assisted generation can be used by Content, but prompt/knowledge tooling belongs to AI Platform.

Dependencies:

- Product/category content powers public catalog.
- AI Platform provides generation/context tooling.
- Storage provides media persistence.

### Business Intelligence

Current source:

- Reporting helpers in `src/features/crm/services/crm-reporting*`
- dashboards in `src/features/pricing`, `src/features/orders`, `src/features/production-planning`, `src/features/admin/services/cms-health.service.ts`
- components in `src/components/admin/operations`, `crm/CrmReportsWorkspace.tsx`, pricing dashboards

Current routes/APIs:

- Admin: `/admin/dashboard`, `/admin/operations`, `/admin/crm/reports`, `/admin/pricing`, `/admin/production`, `/admin/materials/warehouse`
- API: `/api/crm/reports/*`, `/api/orders/dashboard`, `/api/orders/operations-summary`, `/api/orders/production-board`, `/api/pricing/overview`, `/api/production/dashboard`, `/api/production/board`, `/api/admin/health`

Current Prisma models/enums:

- No dedicated BI tables. BI currently reads operational models across CRM, pricing, orders, production, product, and inventory.

Current gaps:

- BI is mostly distributed dashboards rather than a platform-owned reporting layer.
- Report permissions are partially represented by `canViewReports`, but not all dashboard endpoints share a consistent response/auth shape.

Ownership boundary:

- Owns aggregate dashboards, reporting read models, and operational analytics views.
- Should avoid owning write behavior for operational platforms.

Dependencies:

- Reads from all operational platforms.
- Must respect financial redaction and staff scope.

### Operations Platform

Current source:

- `src/features/auth`, `admin-users`, `admin-roles`, `employees`, `delivery`, `settings`, `administrative`, `storage`, `admin`
- `src/lib/admin-auth`, `src/lib/permissions`, `src/lib/logger`, `src/lib/storage`
- `src/components/admin/settings`, `employees`, `delivery`, shell/providers

Current routes/APIs:

- Admin: `/admin/settings/*`, `/admin/employees/*`, `/admin/delivery-methods/*`, `/admin/delivery-carriers/*`, `/admin/debug/favicon`, `/admin/demo`
- API: `/api/admin/auth/*`, `/api/admin/users/*`, `/api/admin/roles/*`, `/api/admin/permissions`, `/api/employees/*`, `/api/delivery-methods/*`, `/api/delivery-carriers/*`, `/api/settings/*`, `/api/admin/administrative/*`, `/api/admin/health`

Current Prisma models/enums:

- `AdminUser`, `AdminRole`, `AdminPermission`, `AdminRolePermission`, `Employee`, `DeliveryMethod`, `DeliveryCarrier`, `CompanySettings`, `TrustMetricsSettings`, `BrandingSettings`, `User`
- `PermissionScope`, `UserRole`, `EmployeeRole`

Current gaps:

- `User` and newer `AdminUser` coexist; do not rename now.
- Auth/permission foundations are spread across `src/features/auth` and `src/lib/admin-auth`, which is acceptable but should be documented as "domain rules" vs "transport/session".
- Demo/debug routes should remain clearly non-production operational tooling.

Ownership boundary:

- Owns admin identity, roles, permissions, employee master data, settings, branding, delivery master data, notifications/audit/jobs/config in future.

Dependencies:

- Every admin platform depends on Operations auth/permissions/session.
- Commercial and Manufacturing depend on employee/delivery master data.

### AI Platform

Current source:

- `src/features/ai`
- `src/features/knowledge-base`
- AI-assisted blog/SEO files in `src/features/blog` and `src/features/seo`
- `src/components/admin/knowledge-base`, `src/components/admin/seo`, blog editor AI panels

Current routes/APIs:

- Admin: `/admin/knowledge-base/*`, `/admin/seo/brief-generator`, `/admin/crm/whatsapp-assistant`
- API: `/api/admin/ai/knowledge-context`, `/api/admin/knowledge-base/*`, `/api/admin/seo/brief`, `/api/crm/whatsapp-assistant/*`

Current Prisma models/enums:

- `KnowledgeBaseCategory`, `KnowledgeBaseSource`, `KnowledgeBaseEntry`, `KnowledgeBaseUsageLog`, `KnowledgeBaseImportJob`
- `KnowledgeBaseEntryType`, `KnowledgeBaseEntryStatus`, `KnowledgeBasePriority`, `KnowledgeBaseSourceType`, `KnowledgeBaseImportJobStatus`

Current gaps:

- AI Platform is split between knowledge-base, SEO, CRM assistant, and blog generation.
- Prompt Library is represented indirectly through knowledge context and SEO prompt composer; no dedicated prompt model yet.
- OCR and AI Image Studio are not yet present.

Ownership boundary:

- Owns knowledge base, prompts/context, AI assistant orchestration, OCR/image studio/automation foundations when added.
- Should not own content publishing outcomes or CRM lead rules; those remain with Content/CRM.

Dependencies:

- Content uses AI for SEO/blog generation.
- CRM assistant uses AI to analyze lead conversations.
- Knowledge base may reference Product/Manufacturing/Commercial content.

### Growth Platform

Current source:

- SEO planning/generation in `src/features/blog` and `src/features/seo`
- attribution in `src/lib/attribution.ts`, analytics in `src/lib/analytics.ts`, `src/components/analytics`
- homepage/public conversion components in `src/components/public`, `home`, `marketplace`

Current routes/APIs:

- Admin: `/admin/seo-planning`, `/admin/seo/brief-generator`
- Public tracking/conversion: public lead forms via `/api/leads`, dealer forms via `/api/dealers`, attribution components

Current Prisma models/enums:

- No dedicated campaign/promotion/coupon/referral/affiliate models currently identified.
- Growth currently uses CRM leads, content, and public attribution fields.

Current gaps:

- Campaign, promotion, coupon, email, Zalo OA, ads, referral, affiliate, and conversion tracking are mostly future modules.
- Attribution exists as shared/public helper code, not as a Growth-owned platform service.

Ownership boundary:

- Owns campaign acquisition, conversion tracking, and growth channel integrations when introduced.
- Should write leads through CRM services and content through Content Platform services.

Dependencies:

- CRM for captured leads.
- Content for landing pages and SEO.
- Product/Public frontend for conversion surfaces.

## Folder Boundary Findings

1. Strong route group separation exists in `src/app`: public, admin, document, B2B portal, and API route groups are clear.
2. Newer modules use service boundaries well, especially products, manufacturing library, orders, pricing, tech-pack, and dealer RFQ.
3. Legacy pages still contain business/data logic and inline UI:
   - `src/app/(backend)/admin/khach-hang-tiem-nang/page.tsx` directly queries Prisma, serializes records, computes metrics, and renders inline tables.
   - `src/app/(backend)/admin/dai-ly/page.tsx` is largely inline admin UI and relies on legacy dealer fields.
4. Some APIs still do direct Prisma access and local validation:
   - `src/app/api/dealers/route.ts`
   - `src/app/api/leads/route.ts`
5. `src/lib` contains a mix of true shared infrastructure and older module content helpers (`siteContent`, `productCatalog`, `clientLogos`, `caseStudies`, `manufacturing-library.*`).
6. Admin/public component separation is mostly respected. Public components live in `src/components/public`, marketplace/home/blog/seo folders; admin components live under `src/components/admin`.
7. Document components are separate but cross-platform by nature (`src/components/quotes`, `src/components/orders/documents`, `src/components/tech-pack`).
8. Empty/legacy folder artifact exists: `src/components/layouts/admin-sidebar.tsx` is empty and should be reviewed later.
9. Old route naming remains for compatibility: `/admin/bai-viet`, `/admin/san-pham`, `/admin/danh-muc`, `/admin/dai-ly`, `/admin/rap`, `/admin/lead`, `/admin/khach-hang-tiem-nang`.
10. These old route names do not need renaming now, but should be documented as aliases under the new IA.

## API Convention Audit

Close to future standard or moving in that direction:

- Product import/variant routes often return `ok` plus structured data and use product feature helpers.
- Admin auth middleware errors include `error`, `message`, `code`, `traceId`, and `fieldErrors`.
- Dealer portal auth service returns typed `ok` results internally.
- Manufacturing admin routes call feature services and return clear Vietnamese messages.
- Orders route handlers enforce financial/access rules and use feature services for detail shaping.

Inconsistent response/error shapes:

- Many legacy APIs return raw arrays or objects directly: `/api/dealers`, `/api/media`, `/api/products`, `/api/categories`.
- Many routes use `{ message }` only for errors rather than `{ ok:false,error:{code,message,details} }`.
- Some routes use `{ success:true }`; others use `{ ok:true }`; others return direct records.
- Product routes mix `{ ok:false, error, message }` with direct payloads.
- Dealer portal helper errors currently return `{ message }`, not normalized error objects.

Mutations missing obvious normalized error handling:

- `/api/dealers` lacks JSON parse protection and uses direct Prisma.
- `/api/leads` lacks JSON parse protection and mixes parsing/domain assembly in the route.
- Several pricing endpoints parse JSON and return `{ message }` without stable error codes.
- Legacy admin/product attribute endpoints have mixed response contracts.

APIs that should eventually move more shared logic into `src/features/[platform]`:

- Public lead capture should call CRM/Growth-owned capture services.
- Dealer legacy registration should move behind Dealer Platform services or be retired behind compatibility wrappers.
- Public media/image endpoints should route through Media/Content service contracts.
- BI dashboards should expose platform-owned read services rather than ad hoc route aggregation.

## Permission Boundary Audit

Admin auth/permission entry points:

- `src/middleware.ts`
- `src/lib/admin-auth/*`
- `src/features/auth/admin-permissions.ts`
- `src/features/auth/admin-permission-catalog.ts`
- `src/features/auth/order-financial-permissions.ts`
- `src/features/auth/order-scope.ts`
- `src/components/admin/AdminPermissionsContext.tsx`

Dealer portal auth entry points:

- `src/lib/dealer-auth/*`
- `src/features/dealer/auth/dealer-auth.service.ts`
- `src/features/dealer/auth/dealer-session.ts`
- `/api/portal/auth/*`
- legacy `/api/dealer-portal/*`

Public token routes:

- `/q/[token]`
- `/quote-link/[quoteLink]`
- `/api/quotes/public/[token]`
- `/api/quotes/public/[token]/pdf`
- `/q/[token]/document`
- `/o/[orderNo]/[docType]`
- order PDF token services under `src/features/orders/*/pdf-token.ts`
- tech-pack document/PDF token helpers under `src/features/tech-pack/pdf`

Mutation routes to verify in future sprint:

- All `/api/admin/*` mutations.
- `/api/crm/*` public/admin mixed endpoints.
- `/api/leads` and `/api/dealers` public capture endpoints.
- `/api/orders/*`, especially payments, production, QC, delivery, material allocation.
- `/api/quotes/*`, especially public link and PDF generation boundaries.
- `/api/production-files/*`, `/api/tech-packs/*`, `/api/patterns/*` private file operations.
- `/api/portal/*` dealer routes.

Obvious high-risk permission areas:

- Middleware is deprecated by Next.js convention and must move to `proxy`, but middleware/proxy alone is not sufficient for mutation authorization.
- Some APIs rely on matcher-level protection plus route logic; future audit should verify every mutation has server-side permission checks inside route/service.
- Financial redaction is present in Orders and should be regression-tested across quote/order/pricing endpoints.
- Dealer portal access is separate and should not inherit admin assumptions.
- Public token routes must be tested for data minimization.

## CMS UI/Component Boundary Audit

Current admin shell/sidebar/nav status after CTO-1:

- `src/components/admin/AdminShell.tsx` renders the global shell.
- `src/lib/admin/admin-navigation.ts` is the central typed IA config.
- The sidebar groups Operating Model v1.0 sections and marks missing pages as `Sắp ra mắt`.

Shared admin components that exist:

- Shell/providers/title/toast/loading: `AdminShell`, `AdminProviders`, `AdminTitleContext`, `AdminToastProvider`, `AdminLoadingProvider`
- Feedback: `AdminErrorRecovery`, `AdminInlineLoader`, `AdminLoadingButton`, `AdminPageSkeleton`, `AdminSectionSkeleton`, `AdminUploadProgress`
- Shared controls: `AdminBackLink`, `AdminSearchableSelect`, `AdminQuickCreateShell`, `AdminUi`
- Module-level shared managers for products, orders, CRM, dealer, manufacturing, production planning, materials, tech-pack, pricing, settings.

Duplicated table/form/button/drawer patterns:

- Inline admin tables exist in legacy pages (`dai-ly`, `khach-hang-tiem-nang`).
- Multiple modules implement local list/table managers instead of one table primitive.
- Quick-add modals exist across orders/materials/delivery with similar patterns.
- Drawers/panels exist in CRM, Operations, Order workspace, and media/selection flows with different local implementations.
- Button classes and admin UI helpers exist, but not every legacy page uses them.

Pages that should migrate to shared components later:

- `/admin/dai-ly`
- `/admin/khach-hang-tiem-nang`
- `/admin/lead`
- `/admin/bai-viet/*` redirects/legacy blog pages
- legacy `/admin/san-pham`, `/admin/danh-muc`, `/admin/rap` aliases should remain but point to modern module components.

CMS Design System compliance risks:

- Inline styles in legacy admin pages conflict with shared operational CMS patterns.
- Some table-first pages have bespoke empty/loading/error states.
- Some module list managers may not share consistent toolbar/filter/table behavior.
- Sidebar is now IA-compliant, but laptop usability should be visually checked after each major nav addition.

## Prisma/Domain Boundary Audit

Platform ownership groups:

- CRM: `Lead`, `Customer`, `Contact`, `CRMActivity`, `CRMProductInterest`, `LeadNote`, sales/revenue adjuncts.
- Commercial: `PriceGroup`, `ProductPriceTier`, `ServicePriceRule`, `PricingCalculation`, `Quote`, `QuoteItem`, `Order`, `OrderItem`, payments/delivery execution.
- Product: product/category/variant/image/option/specification/attribute/import models.
- Dealer: legacy `Dealer`/`DealerLead`, newer `DealerCompany`/`DealerUser`/`DealerActivity`/`DealerRFQ`.
- Manufacturing: manufacturing library, production master data, materials, warehouse, production plan/stage/QC/file models.
- Tech Pack: tech-pack, pattern, measurement template, BOM, artwork, release history models.
- Content: posts/blog/media/homepage/landing/case study/client logo/knowledge base models.
- Operations: admin users/roles/permissions, employees, delivery methods/carriers, company/trust/branding settings, administrative divisions.
- AI: knowledge base models and usage/import state.
- Growth: no dedicated core models yet; uses attribution and CRM/content data.

Intentional cross-platform relations:

- Quotes/orders reference CRM customers/contacts and product/variant snapshots.
- Orders connect to production stages, production files, material allocations, delivery executions, and payments.
- Tech Pack can connect to product/source items and production BOM/readiness.
- Dealer companies link to customers and price groups.
- Manufacturing relations connect evidence assets to products/quotes/orders/other operational targets.

Cross-platform relations needing careful review:

- Dealer legacy/new model overlap.
- ManufacturingRelation target polymorphism should be kept service-mediated.
- Quote manufacturing evidence local unstaged work should be reviewed for ownership and permissions before landing.
- Product material requirements bridge Product and Manufacturing/Materials and need stable ownership rules.
- BI/reporting reads should not become write coupling.

Migration naming status:

- Migration names are mostly sprint-scoped and descriptive (`sprint_26_3_...`, `dealer_portal_foundation_d0_d1`, `sprint_ml1_manufacturing_library`).
- There is an additional timestamped `20260609171354_attd_initial_v1` migration alongside numbered migrations. Do not rewrite old migrations.

Old model naming that should not be changed now:

- `User` vs `AdminUser`
- `Dealer`/`DealerLead` vs `DealerCompany`/`DealerRFQ`
- `Post` vs `BlogPost`
- Vietnamese route aliases (`rap`, `san-pham`, `danh-muc`, `dai-ly`) should remain compatibility routes.

## Known Warnings and Debt

- Build warning: Next.js 16 reports the `middleware` file convention is deprecated and recommends `proxy`.
- Build warning: Turbopack/NFT tracing warning from `next.config.ts` import trace through `src/features/quotes/pdf/quote-pdf-fonts.ts` and `/api/quotes/pdf-health`.
- Local unstaged changes visible before this sprint:
  - `src/app/globals.css`
  - `src/components/admin/quotes/QuoteDetailView.tsx`
  - `src/components/quotes/QuoteDocumentContent.tsx`
  - `src/features/quotes/quote-document.ts`
  - `src/features/quotes/quote.service.ts`
  - `src/features/quotes/types.ts`
  - `src/app/api/quotes/[id]/manufacturing-evidence/`
  - `src/components/admin/quotes/QuoteManufacturingEvidencePicker.tsx`
  - `src/components/quotes/QuoteDocumentManufacturingEvidence.tsx`
  - `src/features/quotes/quote-manufacturing-evidence.service.ts`
- TODO/FIXME search found deprecations rather than many TODOs:
  - `src/lib/trustData.ts`
  - `src/lib/navConfig.ts`
  - `src/features/auth/admin-session.types.ts`
  - `src/features/quotes/types.ts`
  - `src/features/orders/quick-order/quick-order.types.ts`
  - `src/features/products/product-admin.service.ts`
  - `src/features/posts/services/post.service.ts`
  - `src/features/knowledge-base/knowledge-base-import-mapping.ts`
  - deprecated `/api/dealer-portal/*`
  - `src/features/storage/file-classification.ts`

## Prioritized Roadmap

### P0: Production/Security Risks

1. Title: Verify server-side authorization on every mutation
   Affected platform: Operations, all platforms
   Risk level: High
   Recommended sprint: CTO-3 Permission Boundary Verification
   Safe to do now: No, audit and targeted fixes only.

2. Title: Public token data minimization test suite
   Affected platform: Commercial, Tech Pack, Operations
   Risk level: High
   Recommended sprint: CTO-3 or CTO-4
   Safe to do now: Yes, tests only if scoped; no route contract changes without approval.

3. Title: Migrate Next.js `middleware` convention to `proxy`
   Affected platform: Operations
   Risk level: Medium-high due auth gate centrality
   Recommended sprint: CTO-3 infrastructure hardening
   Safe to do now: No, requires careful route smoke and auth regression.

4. Title: Review quote manufacturing evidence local work before merge
   Affected platform: Commercial, Manufacturing
   Risk level: Medium-high
   Recommended sprint: Commercial/Manufacturing evidence integration sprint
   Safe to do now: No, visible local work is outside CTO-2.

### P1: Foundation Refactors

1. Title: Normalize API response helpers
   Affected platform: Operations, all APIs
   Risk level: Medium
   Recommended sprint: CTO-4 API conventions foundation
   Safe to do now: Yes for new helpers/tests; migrate routes gradually.

2. Title: Create platform ownership registry
   Affected platform: Operations, all platforms
   Risk level: Medium
   Recommended sprint: CTO-3/CTO-4
   Safe to do now: Yes, documentation/config only.

3. Title: Move legacy lead/dealer route logic into feature services
   Affected platform: CRM, Dealer, Growth
   Risk level: Medium
   Recommended sprint: CRM/Dealer boundary cleanup
   Safe to do now: No, needs regression coverage.

4. Title: Define BI read-model boundary
   Affected platform: Business Intelligence
   Risk level: Medium
   Recommended sprint: BI foundation
   Safe to do now: Documentation yes; implementation later.

5. Title: Document compatibility route aliases
   Affected platform: Product, Content, Dealer, Tech Pack, CRM
   Risk level: Low-medium
   Recommended sprint: CTO-3 docs/routes hygiene
   Safe to do now: Yes.

### P2: Consistency Improvements

1. Title: Migrate legacy admin pages to shared CMS components
   Affected platform: CRM, Dealer, Product, Content
   Risk level: Medium
   Recommended sprint: CMS UI consistency sprint
   Safe to do now: No large refactors in audit sprint.

2. Title: Move module-like public content helpers out of generic `src/lib`
   Affected platform: Product, Content, Manufacturing
   Risk level: Medium
   Recommended sprint: Platform folder cleanup
   Safe to do now: No, requires import/route validation.

3. Title: Standardize table/form/drawer primitives
   Affected platform: CMS/Admin UI
   Risk level: Low-medium
   Recommended sprint: CMS design system implementation
   Safe to do now: New primitives only; migration later.

4. Title: Review legacy model overlap without renaming
   Affected platform: Dealer, Operations, Content
   Risk level: Medium
   Recommended sprint: Domain model compatibility audit
   Safe to do now: Documentation only.

### P3: Nice-to-Have Cleanup

1. Title: Remove or document empty `src/components/layouts/admin-sidebar.tsx`
   Affected platform: CMS/Admin UI
   Risk level: Low
   Recommended sprint: cleanup
   Safe to do now: Yes if no imports; defer to avoid non-doc changes.

2. Title: Consolidate deprecated comments into a debt register
   Affected platform: all
   Risk level: Low
   Recommended sprint: docs cleanup
   Safe to do now: Yes.

3. Title: Add route/platform index generated from filesystem
   Affected platform: Operations/Docs
   Risk level: Low
   Recommended sprint: tooling
   Safe to do now: Yes, script/docs only.

4. Title: Expand audit docs with owners and sprint labels
   Affected platform: all
   Risk level: Low
   Recommended sprint: planning
   Safe to do now: Yes.

## Top 10 Findings

1. Operating Model v1.0 can be mapped cleanly to current source, but platform ownership is not yet documented outside CTO-1/CTO-2.
2. `src/features` contains mature service boundaries for newer modules, especially products, manufacturing, orders, pricing, dealer RFQ, and tech-pack.
3. Legacy admin pages still mix Prisma queries, data shaping, and inline UI.
4. API response contracts vary widely and need gradual migration to the documented `{ ok, data/error }` standard.
5. Permission foundations exist, but every mutation should be verified inside route/service code, not only by middleware matchers.
6. Dealer Platform has old and new model families; compatibility should be preserved while new work targets `DealerCompany`/`DealerRFQ`.
7. Public token/document routes require continued data-minimization testing.
8. CMS Design System primitives exist but are not uniformly used by older admin pages.
9. Prisma relations intentionally cross platforms, especially Commercial to CRM/Product/Manufacturing, and should be service-mediated.
10. Build warnings are known infrastructure debt: deprecated `middleware` convention and Turbopack/NFT tracing around quote PDF fonts.
