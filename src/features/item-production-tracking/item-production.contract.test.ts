import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("IA M1 item production tracking contracts", () => {
  it("registers timeline route, nav, breadcrumb, and permissions", () => {
    assert.match(read("src/lib/admin/admin-navigation.ts"), /production-timeline/);
    assert.match(read("src/lib/admin/admin-navigation.ts"), /Tiến độ sản xuất/);
    assert.match(read("src/lib/admin/admin-breadcrumbs.ts"), /production-timeline/);
    assert.match(read("src/features/auth/admin-permission-catalog.ts"), /manufacturing\.production\.view/);
    assert.match(read("src/features/auth/admin-permission-catalog.ts"), /manufacturing\.production\.update/);
    assert.match(read("src/features/auth/admin-role-defaults.ts"), /manufacturing\.production\.create/);
  });

  it("exposes manufacturing production APIs", () => {
    assert.match(
      read("src/app/api/manufacturing/production-items/route.ts"),
      /listProductionItems/,
    );
    assert.match(
      read("src/app/api/manufacturing/production-items/initialize-from-order/route.ts"),
      /initializeFromOrder/,
    );
    assert.match(
      read("src/app/api/manufacturing/production-stages/[id]/progress/route.ts"),
      /applyStageProgress/,
    );
  });

  it("timeline page uses AdminPageTitle without local h1", () => {
    const page = read("src/app/(backend)/admin/manufacturing/production-timeline/page.tsx");
    assert.match(page, /AdminPageTitle title="Tiến độ sản xuất"/);
    assert.doesNotMatch(page, /<h1\b/);
    assert.match(
      read("src/components/admin/item-production/ItemProductionTimelineManager.tsx"),
      /AdminLoadingState/,
    );
    assert.match(
      read("src/components/admin/item-production/ItemProductionTimelineManager.tsx"),
      /EmptyState/,
    );
  });

  it("order workspace integrates initialize action", () => {
    assert.match(
      read("src/components/admin/orders/workspace/OrderWorkspaceShell.tsx"),
      /OrderItemProductionPanel/,
    );
    assert.match(
      read("src/components/admin/item-production/OrderItemProductionPanel.tsx"),
      /Khởi tạo theo dõi sản xuất/,
    );
  });

  it("migration and schema define unique orderItem tracking", () => {
    assert.match(read("prisma/schema.prisma"), /model ItemProductionTracking/);
    assert.match(read("prisma/schema.prisma"), /orderItemId\s+String\s+@unique/);
    assert.match(read("prisma/schema.prisma"), /model ItemProductionBatch/);
    assert.match(
      read("prisma/migrations/0084_sprint_m1_item_production_progress_tracking/migration.sql"),
      /ItemProductionProgressEntry/,
    );
    assert.match(
      read("prisma/migrations/0088_sprint_m2_production_batches/migration.sql"),
      /ItemProductionBatch/,
    );
  });

  it("exposes batch manufacturing APIs", () => {
    assert.match(
      read("src/app/api/manufacturing/production-items/[id]/batches/route.ts"),
      /createBatch/,
    );
    assert.match(
      read("src/app/api/manufacturing/production-batches/[batchId]/route.ts"),
      /activateBatch/,
    );
    assert.match(
      read("src/components/admin/item-production/ItemProductionTimelineManager.tsx"),
      /ItemProductionBatchPanel/,
    );
  });

  it("exposes lean ops quick update and issue APIs", () => {
    assert.match(
      read("src/app/api/manufacturing/production-stages/[id]/quick-update/route.ts"),
      /applyQuickStageUpdate/,
    );
    assert.match(
      read("src/app/api/manufacturing/production-items/[id]/issues/route.ts"),
      /reportProductionIssue/,
    );
    assert.match(
      read("src/app/api/manufacturing/production-items/[id]/issues/[issueId]/route.ts"),
      /resolveProductionIssue/,
    );
    assert.match(read("prisma/schema.prisma"), /model ItemProductionIssue/);
    assert.match(read("prisma/schema.prisma"), /sampleStatus/);
    assert.match(read("prisma/schema.prisma"), /nextAction/);
    assert.match(read("prisma/schema.prisma"), /NEEDS_REVISION/);
    assert.match(
      read("src/components/admin/item-production/ItemProductionTimelineManager.tsx"),
      /ItemProductionQuickUpdateModal/,
    );
    assert.match(
      read("src/components/admin/item-production/ItemProductionTimelineManager.tsx"),
      /ItemProductionNextActionCell/,
    );
    assert.match(
      read("src/components/admin/item-production/OrderItemProductionPanel.tsx"),
      /production-timeline\?order=/,
    );
    assert.match(
      read("src/components/admin/item-production/OrderItemProductionPanel.tsx"),
      /ItemProductionInitModal/,
    );
  });
});
