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

`matchedOrderId` and `orderPaymentId` are intentionally application-level audit references rather than database foreign keys. The bank ledger therefore remains independent of Order/Payment lifecycle changes while the service layer validates all reconciliation writes.

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

### Required receiving-account allowlist

ATTD fails closed unless the receiving bank account allowlist is configured:

```text
SEPAY_ALLOWED_ACCOUNT_NUMBERS=1017588888,0123456789
```

Use the exact bank account numbers sent by SePay in `accountNumber`, separated by commas when ATTD has multiple receiving accounts.

If this variable is missing or empty, the webhook returns HTTP 503 and does **not** process any payment. This prevents a partially configured production deployment from accepting transactions from arbitrary linked accounts.

For an authenticated SePay event whose `accountNumber` is not in the allowlist, ATTD acknowledges the event with `{"success":true}` so SePay does not retry it, but the event is **not** written into ATTD or reconciled to an Order.

For Production, configure both the SePay webhook itself to the intended bank account(s) and this ATTD allowlist.

## 3. Webhook URL

Configure the SePay webhook endpoint as:

```text
https://attd.vn/api/webhooks/sepay
```

The endpoint accepts SePay transaction webhooks only. It is not an admin/session-authenticated endpoint; webhook authentication and the receiving-account allowlist are mandatory.

On successful processing (including duplicate/replayed deliveries), ATTD responds with HTTP 200 and exactly:

```json
{"success":true}
```

This is the success response required by SePay; do not add diagnostic fields to the response body.

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

The Order payment tab displays the canonical transfer memo with a copy action for sales/finance users.

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

## 6. Duplicate and concurrency protection

SePay transaction `id` is stored as `externalId` and protected by the unique key:

```text
(provider, externalId)
```

Webhook retries/replays return success without creating another bank transaction or another `OrderPayment`.

ATTD also serializes payment posting per Order before calculating outstanding balance, preventing two different incoming transfers arriving at nearly the same time from both using a stale receivable balance.

Manual reconciliation locks the transaction row before creating a payment, preventing concurrent actions from posting the same transfer twice.

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

The Order → Thanh toán tab shows a copyable payment memo such as `ATTD DH000523` and the current outstanding amount.

## 8. Production activation checklist

1. Merge and deploy this implementation only after the database/environment prerequisites are ready.
2. Apply the database migration.
3. Configure `SEPAY_WEBHOOK_SECRET` (preferred) or `SEPAY_WEBHOOK_API_KEY` in Vercel.
4. Configure the required `SEPAY_ALLOWED_ACCOUNT_NUMBERS` with the ATTD receiving account number(s).
5. Add `https://attd.vn/api/webhooks/sepay` in SePay and bind it only to the intended receiving account(s).
6. Keep event type as incoming-only for Phase 1 when possible.
7. Send a low-value controlled transfer using a real test order and content `ATTD DHxxxxxx`.
8. Verify one `BankTransaction`, one `OrderPayment`, the order payment state, and the Order Activity timeline.
9. Replay/test the same webhook and verify no duplicate payment is created.
10. Test one unmatched transaction and manually reconcile it from `/admin/bank-transactions`.
11. Verify a non-allowlisted account cannot create a payment if multiple accounts are linked in SePay.
12. Only after the controlled tests succeed, rely on automatic reconciliation for normal customer payments.
