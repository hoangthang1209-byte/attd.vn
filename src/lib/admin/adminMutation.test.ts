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

  it("prefers the safe error field over generic message fallback", () => {
    const message = resolveAdminMutationErrorMessage(
      new Response(null, { status: 500 }),
      {
        error: "Không thể lưu bảng đo. Mã tra cứu: ABC123",
        message: "Internal Server Error",
        code: "PATTERN_MEASUREMENT_SAVE_FAILED",
        traceId: "ABC123",
      },
    );
    assert.equal(message, "Không thể lưu bảng đo. Mã tra cứu: ABC123");
  });

  it("falls back for 403 without body copy", () => {
    const message = resolveAdminMutationErrorMessage(new Response(null, { status: 403 }), {});
    assert.equal(message, ADMIN_FORBIDDEN_FALLBACK);
  });
});
