import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readPortalComponentSources(): string {
  const files = [
    "src/components/portal/PortalShell.tsx",
    "src/components/portal/PortalSidebar.tsx",
    "src/components/portal/PortalTopbar.tsx",
    "src/components/portal/PortalActionCard.tsx",
    "src/components/portal/PortalStatusBadge.tsx",
    "src/components/portal/PortalEmptyState.tsx",
    "src/components/portal/PortalLoginForm.tsx",
    "src/components/portal/PortalBusinessGuard.tsx",
    "src/app/(b2b-portal)/portal/page.tsx",
    "src/app/(b2b-portal)/portal/rfq/page.tsx",
    "src/app/(b2b-portal)/portal/pricing/page.tsx",
    "src/app/(b2b-portal)/portal/catalog/page.tsx",
  ];
  return files.map(readRepoFile).join("\n");
}

describe("dealer-portal-sprint-d2", () => {
  it("redirects /dealer/* to /portal/* in next.config", () => {
    const config = readRepoFile("next.config.ts");
    assert.match(config, /source: "\/dealer"/);
    assert.match(config, /destination: "\/portal"/);
    assert.match(config, /source: "\/dealer\/login"/);
    assert.match(config, /destination: "\/portal\/login"/);
    assert.match(config, /source: "\/dealer\/rfq"/);
    assert.match(config, /destination: "\/portal\/rfq"/);
  });

  it("uses separate B2B portal cookie namespace from admin", () => {
    const session = readRepoFile("src/features/dealer/auth/dealer-session.ts");
    const adminConstants = readRepoFile("src/lib/admin-auth/constants.ts");
    assert.match(session, /attd_b2b_portal_session/);
    assert.match(adminConstants, /attd_admin_session/);
    assert.doesNotMatch(session, /attd_admin_session/);
  });

  it("blocks inactive DISABLED users at login service", () => {
    const auth = readRepoFile("src/features/dealer/auth/dealer-auth.service.ts");
    assert.match(auth, /user\.status === "DISABLED"/);
    assert.match(auth, /passwordHash/);
    assert.match(auth, /verifyAdminPasswordHash/);
  });

  it("allows pending company login but portal guards block business pages", () => {
    const auth = readRepoFile("src/features/dealer/auth/dealer-auth.service.ts");
    assert.doesNotMatch(auth, /companyStatus === "PENDING"[\s\S]*return[\s\S]*401/);
    const guard = readRepoFile("src/components/portal/PortalBusinessGuard.tsx");
    assert.match(guard, /ctx\.kind === "pending"/);
    const context = readRepoFile("src/lib/dealer-auth/get-dealer-portal-context.ts");
    assert.match(context, /kind: "pending"/);
    assert.match(context, /kind: "approved"/);
  });

  it("does not return passwordHash from set-password API", () => {
    const route = readRepoFile("src/app/api/dealer/users/[id]/set-password/route.ts");
    assert.doesNotMatch(route, /passwordHash/);
    const service = readRepoFile("src/features/dealer/auth/dealer-auth.service.ts");
    assert.match(service, /passwordSetAt/);
    assert.doesNotMatch(service, /return.*passwordHash/);
  });

  it("portal components avoid B2C marketplace keywords", () => {
    const sources = readPortalComponentSources();
    const forbidden = ["Mua ngay", "Giỏ hàng", "Thanh toán", "flash sale", "checkout"];
    for (const word of forbidden) {
      assert.doesNotMatch(sources, new RegExp(word, "i"), `found forbidden B2C keyword: ${word}`);
    }
  });

  it("ships portal auth API routes", () => {
    for (const route of [
      "src/app/api/portal/auth/login/route.ts",
      "src/app/api/portal/auth/logout/route.ts",
      "src/app/api/portal/auth/me/route.ts",
    ]) {
      assert.ok(readRepoFile(route).length > 0);
    }
  });

  it("admin set-password includes Vietnamese helper guidance", () => {
    const admin = readRepoFile("src/components/admin/dealer/DealerCompanyDetailView.tsx");
    assert.match(
      admin,
      /Mật khẩu tạm thời dùng để đại lý đăng nhập lần đầu/,
    );
  });
});
