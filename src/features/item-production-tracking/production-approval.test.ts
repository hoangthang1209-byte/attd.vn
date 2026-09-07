import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isProductionApprovalGateStage,
  PRODUCTION_APPROVAL_GATE_STAGE_KEYS,
} from "@/features/item-production-tracking/production-approval.types";
import {
  ProductionApprovalValidationError,
  validateReleaseRequirements,
} from "@/features/item-production-tracking/production-approval.validation";

describe("production approval release validation", () => {
  it("cannot RELEASE without artwork when design files are expected", () => {
    assert.throws(
      () =>
        validateReleaseRequirements({
          status: "RELEASED",
          sampleRequired: false,
          artworkFileId: null,
          sampleFileId: null,
          evidenceMediaAssetId: null,
          approvedByContactId: null,
          approvedByName: "Lan",
          artworkOptional: false,
        }),
      (err: unknown) =>
        err instanceof ProductionApprovalValidationError && /artwork/i.test(err.message),
    );
  });

  it("cannot RELEASE without approver", () => {
    assert.throws(
      () =>
        validateReleaseRequirements({
          status: "RELEASED",
          sampleRequired: false,
          artworkFileId: "file-1",
          sampleFileId: null,
          evidenceMediaAssetId: null,
          approvedByContactId: null,
          approvedByName: "  ",
        }),
      (err: unknown) =>
        err instanceof ProductionApprovalValidationError && /người duyệt/i.test(err.message),
    );
  });

  it("sampleRequired=true requires sample evidence", () => {
    assert.throws(
      () =>
        validateReleaseRequirements({
          status: "RELEASED",
          sampleRequired: true,
          artworkFileId: "file-1",
          sampleFileId: null,
          evidenceMediaAssetId: null,
          approvedByContactId: "c1",
          approvedByName: null,
        }),
      (err: unknown) =>
        err instanceof ProductionApprovalValidationError && /duyệt mẫu/i.test(err.message),
    );
  });

  it("sampleRequired=false does not require sample evidence", () => {
    assert.doesNotThrow(() =>
      validateReleaseRequirements({
        status: "RELEASED",
        sampleRequired: false,
        artworkFileId: "file-1",
        sampleFileId: null,
        evidenceMediaAssetId: null,
        approvedByContactId: null,
        approvedByName: "Lan — Marketing",
      }),
    );
  });

  it("valid approval can RELEASE", () => {
    assert.doesNotThrow(() =>
      validateReleaseRequirements({
        status: "RELEASED",
        sampleRequired: true,
        artworkFileId: "art-v2",
        sampleFileId: "sample-v2",
        evidenceMediaAssetId: "zalo-1",
        approvedByContactId: "c1",
        approvedByName: null,
      }),
    );
  });

  it("allows RELEASE without artwork when artworkOptional and note present", () => {
    assert.doesNotThrow(() =>
      validateReleaseRequirements({
        status: "RELEASED",
        sampleRequired: false,
        artworkFileId: null,
        sampleFileId: null,
        evidenceMediaAssetId: null,
        approvedByContactId: null,
        approvedByName: "Lan",
        artworkOptional: true,
        note: "Blank garment — no print",
      }),
    );
  });
});

describe("production approval gate stages", () => {
  it("gates only core manufacturing stages", () => {
    assert.deepEqual([...PRODUCTION_APPROVAL_GATE_STAGE_KEYS], [
      "CUTTING",
      "PRINT_EMBROIDERY",
      "SEWING",
      "WASHING",
      "FINISHING",
    ]);
    for (const key of PRODUCTION_APPROVAL_GATE_STAGE_KEYS) {
      assert.equal(isProductionApprovalGateStage(key), true);
    }
    assert.equal(isProductionApprovalGateStage("MATERIAL_SYNC"), false);
    assert.equal(isProductionApprovalGateStage("IRONING"), false);
    assert.equal(isProductionApprovalGateStage("QC"), false);
    assert.equal(isProductionApprovalGateStage("PACKING"), false);
    assert.equal(isProductionApprovalGateStage("READY_TO_SHIP"), false);
    assert.equal(isProductionApprovalGateStage(null), false);
  });
});

describe("production approval contracts", () => {
  const root = process.cwd();

  it("keeps approved artwork snapshot when newer ACTIVE appears (invalidate on archive)", () => {
    const service = readFileSync(
      join(root, "src/features/item-production-tracking/production-approval.service.ts"),
      "utf8",
    );
    const pack = readFileSync(join(root, "src/features/orders/production-pack.service.ts"), "utf8");
    assert.match(service, /invalidateApprovalsForArchivedArtworkFiles/);
    assert.match(service, /status:\s*"PENDING"/);
    assert.match(service, /artworkStale/);
    assert.match(pack, /invalidateApprovalsForArchivedArtworkFiles/);
  });

  it("bypass records actor/time/reason and never sets RELEASED", () => {
    const service = readFileSync(
      join(root, "src/features/item-production-tracking/production-approval.service.ts"),
      "utf8",
    );
    assert.match(service, /orderItemProductionApprovalBypass\.create/);
    assert.match(service, /actorAdminUserId/);
    assert.match(service, /actorUsernameSnapshot/);
    assert.match(service, /reason/);
    const bypassBlock = service.slice(
      service.indexOf("orderItemProductionApprovalBypass.create"),
      service.indexOf("return { allowed: true }", service.indexOf("orderItemProductionApprovalBypass.create")) +
        40,
    );
    assert.doesNotMatch(bypassBlock, /orderItemProductionApproval\.update/);
    assert.doesNotMatch(bypassBlock, /status:\s*"RELEASED"/);
  });

  it("mutate API requires production.update permission", () => {
    const route = readFileSync(
      join(root, "src/app/api/production/jobs/[orderItemId]/production-approval/route.ts"),
      "utf8",
    );
    assert.match(route, /requireProductionUpdate/);
    assert.match(route, /requireProductionView/);
  });

  it("gate APIs return 409 APPROVAL_REQUIRED", () => {
    const progress = readFileSync(
      join(root, "src/app/api/manufacturing/production-stages/[id]/progress/route.ts"),
      "utf8",
    );
    const quick = readFileSync(
      join(root, "src/app/api/manufacturing/production-stages/[id]/quick-update/route.ts"),
      "utf8",
    );
    assert.match(progress, /ProductionApprovalGateError/);
    assert.match(progress, /status: 409/);
    assert.match(progress, /code: err\.code/);
    assert.match(quick, /bypassReason/);
    assert.match(quick, /status: 409/);
  });
});
