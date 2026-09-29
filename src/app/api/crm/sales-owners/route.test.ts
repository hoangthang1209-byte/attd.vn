import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/crm/sales-owners/route";

describe("GET /api/crm/sales-owners authorization", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const response = await GET(new NextRequest("http://localhost/api/crm/sales-owners"));
    assert.equal(response.status, 401);
  });
});
