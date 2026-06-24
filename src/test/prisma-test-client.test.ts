import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import {
  assertTestDatabaseDistinctFromPrimary,
  parsePostgresConnectionIdentity,
  validateTestDatabaseUrl,
} from "@/test/prisma-test-client";

const HARNESS_MODULE_PATH = pathToFileURL(
  path.resolve(process.cwd(), "src/test/prisma-test-client.ts"),
).href;

type HarnessModule = typeof import("@/test/prisma-test-client");

async function loadHarnessModule(
  env: Record<string, string | undefined>,
): Promise<HarnessModule> {
  const saved: Record<string, string | undefined> = {};
  for (const key of new Set([...Object.keys(env), "DATABASE_URL", "TEST_DATABASE_URL", "ATTD_RUN_DB_TESTS"])) {
    saved[key] = process.env[key];
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return (await import(`${HARNESS_MODULE_PATH}?t=${Date.now()}-${Math.random()}`)) as HarnessModule;
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("validateTestDatabaseUrl", () => {
  it("rejects missing and placeholder values", () => {
    assert.equal(validateTestDatabaseUrl("").ok, false);
    assert.equal(
      validateTestDatabaseUrl("POSTGRESQL_CONNECTION_STRING_CUA_TEST_DB").ok,
      false,
    );
    assert.match(
      validateTestDatabaseUrl("POSTGRESQL_CONNECTION_STRING_CUA_TEST_DB").ok
        ? ""
        : (validateTestDatabaseUrl("POSTGRESQL_CONNECTION_STRING_CUA_TEST_DB") as { message: string })
            .message,
      /placeholder/i,
    );
  });

  it("accepts postgres and postgresql URLs", () => {
    const url = "postgresql://test_user:test_pass@localhost:5432/attd_test_db";
    const result = validateTestDatabaseUrl(url);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url, url);
    }
  });

  it("rejects non-postgres schemes", () => {
    assert.equal(validateTestDatabaseUrl("mysql://user:pass@localhost/db").ok, false);
    assert.equal(validateTestDatabaseUrl("http://localhost/db").ok, false);
  });

  it("rejects obvious placeholder host, database, and user segments", () => {
    assert.match(
      validateTestDatabaseUrl("postgresql://USER:PASS@HOST:5432/ISOLATED_TEST_DB").ok
        ? ""
        : (validateTestDatabaseUrl("postgresql://USER:PASS@HOST:5432/ISOLATED_TEST_DB") as { message: string })
            .message,
      /placeholder/i,
    );
  });
});

describe("parsePostgresConnectionIdentity", () => {
  it("normalizes host, port, database, and user", () => {
    const identity = parsePostgresConnectionIdentity(
      "postgresql://user_a:secret@DB-Host.example.com:5433/my_db?schema=public",
    );
    assert.deepEqual(identity, {
      host: "db-host.example.com",
      port: "5433",
      database: "my_db",
      user: "user_a",
    });
  });
});

describe("assertTestDatabaseDistinctFromPrimary (loaded module)", () => {
  it("allows distinct databases even when query params differ", () => {
    assert.doesNotThrow(() =>
      assertTestDatabaseDistinctFromPrimary(
        "postgresql://user:pass@localhost:5432/attd_test_only?schema=public",
      ),
    );
  });
});

describe("primary database identity safety", () => {
  const primaryUrl =
    "postgresql://primary_user:primary_pass@primary-host.example.com:5432/primary_db?schema=public";
  const isolatedTestUrl =
    "postgresql://test_user:test_pass@test-host.example.com:5432/attd_integration_test_only?schema=public";

  it("accepts an isolated test database distinct from the original primary URL", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: primaryUrl,
      TEST_DATABASE_URL: isolatedTestUrl,
      ATTD_RUN_DB_TESTS: "1",
    });

    assert.doesNotThrow(() => harness.assertTestDatabaseDistinctFromPrimary(isolatedTestUrl));
    assert.doesNotThrow(() => harness.requireValidTestDatabaseUrl());
  });

  it("rejects a test URL that matches the original primary database identity", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: primaryUrl,
      TEST_DATABASE_URL: "postgresql://primary_user:primary_pass@primary-host.example.com:5432/primary_db",
      ATTD_RUN_DB_TESTS: "1",
    });

    assert.throws(
      () => harness.assertTestDatabaseDistinctFromPrimary(harness.TEST_DATABASE_URL),
      /same PostgreSQL database as the original DATABASE_URL/i,
    );
  });

  it("does not false-reject after runtime bootstrap mutates process.env.DATABASE_URL", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: primaryUrl,
      TEST_DATABASE_URL: isolatedTestUrl,
      ATTD_RUN_DB_TESTS: "1",
    });

    process.env.DATABASE_URL = isolatedTestUrl;
    assert.equal(process.env.DATABASE_URL, harness.TEST_DATABASE_URL);

    assert.doesNotThrow(() => harness.assertTestDatabaseDistinctFromPrimary(isolatedTestUrl));
    assert.doesNotThrow(() => harness.requireValidTestDatabaseUrl());
  });

  it("treats a second bootstrap request as idempotent without re-checking mutable DATABASE_URL", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: primaryUrl,
      TEST_DATABASE_URL: isolatedTestUrl,
      ATTD_RUN_DB_TESTS: "1",
    });

    const fakeClient = { $disconnect: async () => undefined } as unknown as import("@prisma/client").PrismaClient;
    harness.__harnessTestSeedBootstrappedClient(fakeClient, isolatedTestUrl);

    const first = await harness.bootstrapDatabaseTestEnvironment();
    const second = await harness.bootstrapDatabaseTestEnvironment();
    assert.equal(first, second);
    assert.equal(harness.isDatabaseTestEnvironmentBootstrapped(), true);

    await harness.releaseDatabaseTestEnvironment();
    assert.equal(process.env.DATABASE_URL, primaryUrl);
  });

  it("restores the original DATABASE_URL on release", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: primaryUrl,
      TEST_DATABASE_URL: isolatedTestUrl,
      ATTD_RUN_DB_TESTS: "1",
    });

    const fakeClient = { $disconnect: async () => undefined } as unknown as import("@prisma/client").PrismaClient;
    harness.__harnessTestSeedBootstrappedClient(fakeClient, isolatedTestUrl);

    try {
      assert.equal(process.env.DATABASE_URL, isolatedTestUrl);
      await harness.releaseDatabaseTestEnvironment();
      assert.equal(process.env.DATABASE_URL, primaryUrl);
      assert.equal(harness.isDatabaseTestEnvironmentBootstrapped(), false);
    } finally {
      delete (globalThis as { prisma?: import("@prisma/client").PrismaClient }).prisma;
    }
  });
});

describe("database test opt-in reporting", () => {
  it("reports a clear skip reason when DB tests are not opted in", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: "postgresql://primary:pass@localhost:5432/primary_db",
      TEST_DATABASE_URL: "postgresql://test:pass@localhost:5432/test_db",
      ATTD_RUN_DB_TESTS: undefined,
    });

    assert.match(harness.getDatabaseTestsSkipReason(), /ATTD_RUN_DB_TESTS=1/);
    assert.equal(harness.shouldRunDatabaseBackedTests(), false);
    assert.doesNotThrow(() => harness.enforceDatabaseTestPrerequisites());
  });

  it("fails fast with a concise root cause when opted in with an invalid URL", async () => {
    const harness = await loadHarnessModule({
      DATABASE_URL: "postgresql://primary:pass@localhost:5432/primary_db",
      TEST_DATABASE_URL: "POSTGRESQL_CONNECTION_STRING_CUA_TEST_DB",
      ATTD_RUN_DB_TESTS: "1",
    });

    assert.throws(
      () => harness.enforceDatabaseTestPrerequisites(),
      /Database-backed tests blocked:.*placeholder/i,
    );
  });
});
