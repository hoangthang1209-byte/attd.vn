import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminNavigationSections,
  DEV_ONLY_NAV_HREFS,
  filterNavigationForDeveloperMode,
} from "@/lib/admin/admin-navigation";
import {
  getCmsBusinessStatusHint,
  getCmsBusinessStatusLabel,
} from "@/lib/admin/cms-health-labels";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Issue 104 — business-first admin dashboards", () => {
  it("hides automation nav unless Developer Mode is on", () => {
    assert.ok(DEV_ONLY_NAV_HREFS.includes("/admin/automation"));

    const teamDefault = filterNavigationForDeveloperMode(adminNavigationSections, false);
    const config = teamDefault.find((s) => s.label === "CẤU HÌNH");
    assert.ok(config);
    const hrefs = config.platforms.flatMap((p) => p.items.map((i) => i.href));
    assert.ok(!hrefs.includes("/admin/automation"));

    const devOn = filterNavigationForDeveloperMode(adminNavigationSections, true);
    const configDev = devOn.find((s) => s.label === "CẤU HÌNH");
    assert.ok(configDev);
    const devHrefs = configDev.platforms.flatMap((p) => p.items.map((i) => i.href));
    assert.ok(devHrefs.includes("/admin/automation"));
  });

  it("maps CMS health to plain Vietnamese business labels", () => {
    assert.equal(getCmsBusinessStatusLabel({ ready: true, databaseConnected: true }), "Sẵn sàng");
    assert.equal(getCmsBusinessStatusLabel({ ready: false, databaseConnected: false }), "Lỗi kết nối");
    assert.equal(getCmsBusinessStatusLabel({ ready: false, databaseConnected: true }), "Cần kiểm tra");

    const hint = getCmsBusinessStatusHint({
      ready: false,
      databaseConnected: true,
      blobConfigured: false,
    });
    assert.ok(hint?.includes("Lưu trữ ảnh"));
    assert.doesNotMatch(hint ?? "", /prisma|migrate/i);
  });

  it("CmsHealthCard gates Prisma/migration details behind Developer Mode", () => {
    const source = read("src/components/admin/CmsHealthCard.tsx");
    assert.match(source, /useWorkspaceMode/);
    assert.match(source, /developerMode \?/);
    assert.match(source, /Trạng thái CMS/);
    assert.match(source, /Prisma Tables/);
  });

  it("CmsDiagnosticsPanel is hidden unless Developer Mode is on", () => {
    const source = read("src/components/admin/CmsDiagnosticsPanel.tsx");
    assert.match(source, /if \(!developerMode\)/);
    assert.match(source, /return null/);
  });

  it("AdminEnvironmentBadge is hidden unless Developer Mode is on", () => {
    const source = read("src/components/admin/AdminEnvironmentBadge.tsx");
    assert.match(source, /useWorkspaceMode/);
    assert.match(source, /!developerMode/);
  });

  it("AdminShell applies developer-mode nav filter", () => {
    const source = read("src/components/admin/AdminShell.tsx");
    assert.match(source, /filterNavigationForDeveloperMode/);
    assert.match(source, /developerMode/);
  });

  it("Content AI admin shows business summary when Developer Mode is off", () => {
    const source = read("src/components/admin/content/ContentAiAdminClient.tsx");
    assert.match(source, /if \(!developerMode\)/);
    assert.match(source, /Trạng thái AI nội dung/);
  });

  it("CRM leads hides prisma migrate command from team users", () => {
    const source = read("src/components/admin/CrmLeadsManager.tsx");
    assert.match(source, /developerMode/);
    assert.match(source, /liên hệ bộ phận kỹ thuật/);
  });
});
