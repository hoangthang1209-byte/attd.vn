-- Bank transaction ledger for webhook-driven payment reconciliation.
-- Intentionally stores the provider payload separately from OrderPayment so
-- unmatched/needs-review transfers remain auditable without creating payments.

CREATE TABLE "BankTransaction" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'SEPAY',
  "externalId" TEXT NOT NULL,
  "gateway" TEXT NOT NULL,
  "transactionAt" TIMESTAMP(3) NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "subAccount" TEXT,
  "code" TEXT,
  "content" TEXT NOT NULL,
  "transferType" TEXT NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "accumulated" DECIMAL(14, 2),
  "referenceCode" TEXT,
  "description" TEXT,
  "rawPayload" JSONB NOT NULL,
  "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "matchReason" TEXT,
  "matchedOrderId" TEXT,
  "orderPaymentId" TEXT,
  "matchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankTransaction_provider_externalId_key"
  ON "BankTransaction"("provider", "externalId");

CREATE UNIQUE INDEX "BankTransaction_orderPaymentId_key"
  ON "BankTransaction"("orderPaymentId");

CREATE INDEX "BankTransaction_transactionAt_idx"
  ON "BankTransaction"("transactionAt");

CREATE INDEX "BankTransaction_matchStatus_idx"
  ON "BankTransaction"("matchStatus");

CREATE INDEX "BankTransaction_matchedOrderId_idx"
  ON "BankTransaction"("matchedOrderId");

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_matchedOrderId_fkey"
  FOREIGN KEY ("matchedOrderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_orderPaymentId_fkey"
  FOREIGN KEY ("orderPaymentId") REFERENCES "OrderPayment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
