import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminTitleOwnerStore } from "@/components/admin/admin-title-ownership";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";

describe("AdminPageTitle ownership lifecycle", () => {
  it("sets title on mount (owner apply)", () => {
    const store = createAdminTitleOwnerStore();
    const owner = Symbol("page-a");
    store.setTitle("Page A", owner);
    assert.equal(store.getTitle(), "Page A");
  });

  it("clears title on unmount when owner still owns the override", () => {
    const store = createAdminTitleOwnerStore();
    const owner = Symbol("page-a");
    store.setTitle("Page A", owner);
    store.clearTitle(owner);
    assert.equal(store.getTitle(), "");
  });

  it("does not persist page A title into page B with no override", () => {
    const store = createAdminTitleOwnerStore();
    const pageA = Symbol("page-a");
    store.setTitle("Page A", pageA);
    store.clearTitle(pageA);

    assert.equal(store.getTitle(), "");
    const fallback = getAdminBreadcrumbMeta("/admin/dashboard");
    assert.equal(store.getTitle() || fallback.title, "Dashboard");
  });

  it("does not let stale cleanup clear a newer title", () => {
    const store = createAdminTitleOwnerStore();
    const older = Symbol("older");
    const newer = Symbol("newer");

    store.setTitle("Older", older);
    store.setTitle("Newer", newer);
    store.clearTitle(older);

    assert.equal(store.getTitle(), "Newer");
  });

  it("resumes breadcrumb fallback after override removal", () => {
    const store = createAdminTitleOwnerStore();
    const owner = Symbol("override");
    store.setTitle("Override title", owner);
    store.clearTitle(owner);

    const meta = getAdminBreadcrumbMeta("/admin/media");
    assert.equal(store.getTitle(), "");
    assert.equal(store.getTitle() || meta.title, "Thư viện tài sản");
    assert.deepEqual(meta.breadcrumbs, ["MEDIA", "Thư viện tài sản"]);
  });
});
