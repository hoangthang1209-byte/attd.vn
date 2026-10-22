import assert from "node:assert/strict";
import test from "node:test";
import {
  RFQ_TO_QUOTATION_WORKFLOW,
  assertRfqWorkflowInvariants,
  listReadyRfqSteps,
} from "@/features/agent-os/rfq-to-quotation.workflow";

test("RFQ workflow invariants hold", () => {
  assert.doesNotThrow(() => assertRfqWorkflowInvariants());
  assert.equal(RFQ_TO_QUOTATION_WORKFLOW.length, 7);
});

test("only sales qualification is ready initially", () => {
  assert.deepEqual(listReadyRfqSteps({}).map((step) => step.id), ["sales_qualify"]);
});

test("product analysis becomes ready after sales qualification", () => {
  assert.deepEqual(
    listReadyRfqSteps({ sales_qualify: "DONE" }).map((step) => step.id),
    ["product_analyze"],
  );
});

test("sourcing and production fan out after technical analysis", () => {
  assert.deepEqual(
    listReadyRfqSteps({
      sales_qualify: "DONE",
      product_analyze: "DONE",
    }).map((step) => step.id),
    ["sourcing_check", "production_check"],
  );
});

test("quote draft cannot run before finance and operational dependencies complete", () => {
  const ready = listReadyRfqSteps({
    sales_qualify: "DONE",
    product_analyze: "DONE",
    sourcing_check: "DONE",
    production_check: "DONE",
  }).map((step) => step.id);

  assert.deepEqual(ready, ["finance_check"]);
});

test("chief review only opens after quote draft", () => {
  const ready = listReadyRfqSteps({
    sales_qualify: "DONE",
    product_analyze: "DONE",
    sourcing_check: "DONE",
    production_check: "DONE",
    finance_check: "DONE",
    sales_draft_quote: "DONE",
  }).map((step) => step.id);

  assert.deepEqual(ready, ["chief_review"]);
});
