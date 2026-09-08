# SePay bank webhook — ATTD

## Scope

Phase 1 synchronizes bank transactions into ATTD and automatically reconciles **incoming VND transfers** against existing orders.

- Source of truth for bank events: `BankTransaction` ledger.
- Source of truth for order receivables: existing `OrderPayment` records.
- Incoming transfers with a valid order reference are auto-recorded only when the amount does not exceed the outstanding balance.
- Ambiguous, overpaid, completed/cancelled-order, and non-VND cases are stored for manual review and do **not** create an `OrderPayment`.
- Financial users can manually match unresolved incoming transfers to a valid order, or mark them ignored.
- Outgoing transfers are stored as `IGNORED` in Phase 1.

## 1. Database migration

Deploy the migration before enabling the webhook:

```bash
npx prisma migrate deploy
```

Migration:

`prisma/migrations/20260908154000_add_bank_transactions/migration.sql`

Prisma model:

`prisma/banking.prisma`

The repository uses Prisma multi-file schema loading (`prisma.schema = "./prisma"`) so the banking table remains part of the managed Prisma data model without modifying the large core `schema.prisma` file.

## 2. Authentication configuration

Use HMAC in production when available.

### Recommended: HMAC-SHA256

Set this environment variable in Vercel Production and Preview as appropriate:

```text
SEPAY_WEBHOOK_SECRET=<secret generated/configured for the SePay webhook>
```

ATTD validates:

- `X-SePay-Signature`
- `X-SePay-Timestamp`
- HMAC-SHA256 over `{timestamp}.{raw_body}`
- maximum timestamp drift of 5 minutes

### Fallback: API key

If the SePay webhook is configured with API Key authentication instead of HMAC:

```text
SEPAY_WEBHOOK_API_KEY=<webhook api key>
```

If both variables exist, ATTD prefers HMAC and does not fall back to the API key for that request.

Never commit either secret to GitHub.

## 3. Webhook URL

Configure the SePay webhook endpoint as:

```text
https://attd.vn/api/webhooks/sepay
```

The endpoint accepts SePay transaction webhooks only. It is not an admin/session-authenticated endpoint; webhook authentication is mandatory.

## 4. Transfer content convention

ATTD matches the existing six-digit order number. Ask customers to include:

```text
ATTD DH000523
```

The matcher also accepts common equivalents such as:

```text
DH-000523
DH 000523
DH_000523
```

The canonical ATTD order remains `DH-000523`.

For the highest automatic match rate, future quotation/order QR generation should pre-fill the transfer content using this convention.

## 5. Reconciliation behavior

### Automatically matched

Example:

- Order: `DH-000523`
- Outstanding: `43,250,000 VND`
- Incoming transfer: `43,250,000 VND`
- Content: `ATTD DH000523`

Result:

1. SePay transaction is written to `BankTransaction`.
2. ATTD finds `DH-000523`.
3. ATTD creates one confirmed `OrderPayment` with method `BANK_TRANSFER`.
4. Existing order finance logic recalculates `UNPAID / PARTIAL / PAID / OVERPAID` automatically.
5. An `OrderActivity` records that the payment came from SePay.
6. The bank transaction becomes `MATCHED`.

### Needs review

No payment is created automatically when:

- transfer amount exceeds the order outstanding balance;
- order is already completed or cancelled;
- order currency is not VND;
- the order has no remaining receivable.

The transaction is saved with `NEEDS_REVIEW` and linked to the detected order when possible.

### Unmatched

If no valid `DH-xxxxxx` order number is found, or the referenced order does not exist, the transaction remains `UNMATCHED`.

### Manual reconciliation

Users with order-update + financial access can resolve `UNMATCHED` or `NEEDS_REVIEW` incoming transfers from the Admin banking screen.

**Khớp thủ công**:

1. Enter a valid order number such as `DH-000523`.
2. ATTD locks the bank transaction row to prevent concurrent double-posting.
3. The same safety rules used by automatic matching are checked again.
4. If valid, one confirmed `OrderPayment` is created and the transaction becomes `MATCHED`.

Manual matching still refuses completed/cancelled orders, non-VND orders, orders with no receivable, and transfers larger than the remaining receivable.

**Bỏ qua** marks an unresolved transaction `IGNORED` without creating a payment. Phase 1 does not provide an “unignore” action.

## 6. Duplicate protection

SePay transaction `id` is stored as `externalId` and protected by the unique key:

```text
(provider, externalId)
```

Webhook retries/replays return success without creating another bank transaction or another `OrderPayment`.

Manual reconciliation also locks the transaction row before creating a payment, preventing concurrent actions from posting the same transfer twice.

## 7. Admin screen

Financial users can view:

```text
/admin/bank-transactions
```

The screen refreshes every 15 seconds and supports:

- All
- Unmatched
- Needs review
- Matched
- Ignored

Matched/detected rows link directly to the existing ATTD order detail screen. Users with update permission can manually match unresolved incoming transfers or ignore them.

## 8. Production activation checklist

1. Merge and deploy this implementation.
2. Apply the database migration.
3. Configure `SEPAY_WEBHOOK_SECRET` (preferred) or `SEPAY_WEBHOOK_API_KEY` in Vercel.
4. Add `https://attd.vn/api/webhooks/sepay` in SePay.
5. Send a low-value controlled transfer using a real test order and content `ATTD DHxxxxxx`.
6. Verify one `BankTransaction`, one `OrderPayment`, the order payment state, and the Order Activity timeline.
7. Replay/test the same webhook and verify no duplicate payment is created.
8. Test one unmatched transaction and manually reconcile it from `/admin/bank-transactions`.
9. Only after the controlled tests succeed, enable the webhook for the production receiving account(s).
