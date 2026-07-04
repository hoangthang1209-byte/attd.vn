import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_FORBIDDEN_FALLBACK,
  ADMIN_SESSION_EXPIRED_MESSAGE,
  resolveAdminMutationErrorMessage,
} from "@/lib/admin/adminMutation";

describe("resolveAdminMutationErrorMessage", () => {
  it("maps 401 to session expired copy", () => {
    const message = resolveAdminMutationErrorMessage(
      new Response(null, { status: 401 }),
      { message: "Unauthorized" },
    );
    assert.equal(message, ADMIN_SESSION_EXPIRED_MESSAGE);
  });

  it("maps 403 to server-provided forbidden copy", () => {
    const message = resolveAdminMutationErrorMessage(
      new Response(null, { status: 403 }),
      { error: "Bạn không có quyền cập nhật rập này." },
    );
    assert.equal(message, "Bạn không có quyền cập nhật rập này.");
  });

  it("falls back for 403 without body copy", () => {
    const message = resolveAdminMutationErrorMessage(new Response(null, { status: 403 }), {});
    assert.equal(message, ADMIN_FORBIDDEN_FALLBACK);
  });
});
