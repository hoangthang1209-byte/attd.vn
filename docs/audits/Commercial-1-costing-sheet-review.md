# Commercial-1 Costing Sheet Review — `VNC QUOTATION (4).xlsx`

## Purpose

This review documents the current Google Sheet costing workflow so the ATTD.vn Commercial-1 MVP can reproduce the practical sales calculation flow without rebuilding a full ERP.

## Workbook structure

The workbook contains these sheets:

| Sheet | Role |
| --- | --- |
| `2026` | Main quotation worksheet. Contains customer quote rows, product/order rows, language-driven labels, lookup formulas, totals, and quote output fields. |
| `Data` | Master data for customer information, incoterms, shipping methods, translation strings, and quote metadata. |
| `Giá Vải` | Fabric/material price master. Includes fabric type, composition, supplier, GSM, width, meters/kg and price/kg. |
| `Định mức` | Consumption/reference table by category, order, product, design and measurement/size context. |
| `Lợi nhuận biên` | Margin table by quantity tier and business type. Contains production/export/blank/commercial margin assumptions. |
| `Giá In` | Print costing/reference area. Includes fabric/gsm/width/meter assumptions and print-related estimation space. |
| `Giá Cắt May` | Cutting/sewing supplier price table. Includes supplier, product, process description and unit price. |
| `Logistics Cost` | Logistics estimation sheet. Includes shipping term, destination, quantity, unit price, carton size and totals. |
| `TÍNH GIÁ NHANH` | Quick costing calculator. Repeated blocks calculate fabric cost, rib/accessory/process costs, total cost, selling price, profit and quantity. |
| `Giá CMPT` | CMPT process table. Lists process steps such as marker making, cutting, sewing, ironing, QC and packing. |
| `Sheet35` | Internal summary/cashflow-like working sheet; not part of calculator MVP. |

## Key input fields observed

### Main quotation sheet `2026`

Important fields include:

- Customer name and contact details via `Data` lookup.
- Quote date.
- Row number / item number.
- Color.
- Product/style name.
- Product category.
- Quantity.
- Unit price.
- Line amount.
- Quote labels controlled by language cell `A1`.

Examples of formulas:

- `=IF($A$1=Data!X$3,Data!Y4,Data!Z4)` for bilingual labels.
- `=VLOOKUP(F5,Data!$B:$H,2,0)` and related customer/contact lookups.

### Fabric/material sheet `Giá Vải`

Observed fields:

- Date.
- Fabric type.
- Composition.
- Supplier fabric code.
- Supplier.
- GSM.
- Fabric width.
- Meters per kg.
- Unit.
- Price per kg.

Important formula pattern:

- `metersPerKg = 1000 / gsm / (width + allowance)`.

Example formula:

- `=1000/F3/(G3+0.05)`.

### Consumption sheet `Định mức`

Observed fields:

- Product category.
- Market.
- Reference order.
- Product/style.
- Design.
- Sample size.
- Width/chest/length/sleeve and related measurement references.

This sheet is not a single formula engine; it is a reference base for selecting realistic fabric consumption by product type.

### Margin sheet `Lợi nhuận biên`

Observed fields:

- Quantity tier.
- Export margin.
- Production margin.
- Blank apparel margin.
- Commercial/trading margin.

The margin table is tiered by quantity. Smaller quantities use higher target margins; larger quantities use lower target margins.

### Quick calculator `TÍNH GIÁ NHANH`

This is the most important MVP model.

Repeated blocks include:

- Fabric/material label.
- `Giá vải`.
- `Định mức`.
- `Cost vải`.
- `Bo`.
- `In`.
- `Nút + dây`.
- `May`.
- `Cắt`.
- `Đóng gói + bao bì, thùng`.
- `Tổng cost`.
- `Giá bán`.
- `LN`.
- `SL`.

Key formulas:

- `Cost vải = Giá vải / Định mức`.
- `Tổng cost = SUM(cost components)`.
- `LN = Giá bán - Tổng cost`.

## Pricing logic extracted for MVP

The MVP should model the sheet as a flexible component-based calculator:

1. Select or enter product.
2. Enter quantity.
3. Enter main material/fabric:
   - material name,
   - GSM,
   - material/fabric price,
   - consumption/định mức,
   - optional manual material cost per unit.
4. Add default apparel components:
   - rib/bo,
   - cutting,
   - sewing,
   - printing,
   - embroidery,
   - wash,
   - packaging,
   - logistics.
5. Allow arbitrary extra cost components.
6. Add overhead percentage.
7. Add target margin percentage.
8. Add VAT percentage.
9. Calculate:
   - material cost per unit,
   - process cost per unit,
   - overhead cost per unit,
   - total cost per unit,
   - total cost,
   - suggested selling price per unit,
   - revenue before VAT,
   - VAT amount,
   - final quote price,
   - gross profit,
   - actual margin rate.

## Important design implication

ATTD products are diverse: blank garments, made-to-order apparel, bags, hats, tumblers, bandanas, gift sets, print-only jobs and OEM projects. Therefore the calculator must not hard-code only apparel fields.

The recommended structure is:

- Keep first-class fields for the most common apparel workflow: fabric price, consumption, rib/bo, cutting, sewing, printing, embroidery, wash, packaging, logistics.
- Add `components[]` for unlimited extra cost rows.
- Store the full input and output in `PricingCalculation.inputSnapshot` and `PricingCalculation.resultSnapshot`.
- Map the result to a normal `PricingCalculationItem` so it can safely reuse the existing Quote flow.

## MVP output fields

Quote-ready output should include:

- Product name.
- Variant/SKU if selected.
- Quantity.
- Unit.
- Suggested unit price.
- Line total before VAT.
- VAT amount.
- Final quote amount.
- Cost estimate.
- Gross profit.
- Margin rate.
- Full cost component breakdown in `pricingSnapshot`.

## Non-goals

Commercial-1 should not:

- Replace the current Pricing Engine.
- Replace Quote Builder.
- Modify public frontend.
- Add a full ERP costing master-data model.
- Force every product into apparel-only fields.

## Implementation recommendation

Add a new costing mode under the existing pricing module:

- Admin route: `/admin/pricing/costing`.
- API route: `/api/pricing/costing`.
- Service: `src/features/pricing/services/costing-calculator.service.ts`.
- Types: `src/features/pricing/costing-types.ts`.

Saving should create a `PricingCalculation` and one quote-ready `PricingCalculationItem`, with snapshots preserving the full costing breakdown.

## Commercial-1 implementation status

Implemented as an MVP under the existing Pricing module to avoid duplicating ERP-level pricing logic. The calculator supports flexible extra cost components so ATTD can price apparel, bags, hats, tumblers, bandanas, gift sets, OEM and commercial items from the same sales workflow.

## Commercial-2 acceleration note

Commercial-2 adds static cost templates (no database model) as a non-ERP acceleration layer so Sales can apply predefined costing defaults per product group, then edit fields and extra cost rows as needed before calculation/save/quote.

## Commercial-3 acceleration note

Commercial-3 adds quantity break pricing as a non-ERP acceleration layer by recalculating the same costing input across selected quantity tiers, helping Sales generate multi-quantity quote tables quickly without changing the core pricing/quote flow.

## Commercial-4 acceleration note

Commercial-4 integrates Costing -> Quote Draft so quote items carry costing context (material/fabric, margin/overhead/VAT metadata) and preserve quantity breaks in snapshots for internal sales follow-up.

## Commercial-5 acceleration note

Commercial-5 introduced a reusable Cost Library layer to accelerate sales costing while keeping calculation logic unchanged.
