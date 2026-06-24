import { PrismaClient } from "@prisma/client";

/** Captured before any test harness mutates process.env.DATABASE_URL. */
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL?.trim() ?? "";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim() ?? "";

export const ATTD_RUN_DB_TESTS = process.env.ATTD_RUN_DB_TESTS === "1";

const PLACEHOLDER_URL_PATTERN =
  /^(POSTGRESQL_|YOUR_|CHANGE_ME|REPLACE_ME|<.*>)/i;

const PLACEHOLDER_HOSTNAMES = new Set([
  "host",
  "user",
  "pass",
  "password",
  "changeme",
  "your_host",
  "your-host",
  "hostname",
]);

const PLACEHOLDER_DATABASE_NAMES = new Set([
  "isolated_test_db",
  "test_db_name",
  "dbname",
  "database_name",
  "your_database",
]);

const PLACEHOLDER_USERNAMES = new Set([
  "user",
  "username",
  "your_user",
  "db_user",
]);

export type PostgresConnectionIdentity = {
  host: string;
  port: string;
  database: string;
  user: string;
};

export type TestDatabaseUrlValidation =
  | { ok: true; url: string }
  | { ok: false; message: string };

export function validateTestDatabaseUrl(
  rawUrl: string | null | undefined,
): TestDatabaseUrlValidation {
  const trimmed = rawUrl?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      message:
        "TEST_DATABASE_URL is missing. Provide a disposable postgres:// or postgresql:// URL for isolated database-backed tests.",
    };
  }

  if (!trimmed.includes("://")) {
    if (PLACEHOLDER_URL_PATTERN.test(trimmed) || /^[A-Z0-9_]+$/.test(trimmed)) {
      return {
        ok: false,
        message: `TEST_DATABASE_URL looks like a placeholder (${trimmed}), not a PostgreSQL connection URL.`,
      };
    }
    return {
      ok: false,
      message:
        "TEST_DATABASE_URL must be a PostgreSQL connection URL starting with postgres:// or postgresql://.",
    };
  }

  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      message:
        "TEST_DATABASE_URL must use the postgres:// or postgresql:// scheme.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      message: "TEST_DATABASE_URL is not a valid PostgreSQL connection URL.",
    };
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return {
      ok: false,
      message:
        "TEST_DATABASE_URL must use the postgres:// or postgresql:// scheme.",
    };
  }

  if (!parsed.hostname) {
    return {
      ok: false,
      message: "TEST_DATABASE_URL must include a hostname.",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PLACEHOLDER_HOSTNAMES.has(hostname)) {
    return {
      ok: false,
      message: `TEST_DATABASE_URL hostname looks like a placeholder (${parsed.hostname}). Use a real isolated PostgreSQL host.`,
    };
  }

  const database = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
  if (!database) {
    return {
      ok: false,
      message: "TEST_DATABASE_URL must include a database name.",
    };
  }

  if (PLACEHOLDER_DATABASE_NAMES.has(database.toLowerCase())) {
    return {
      ok: false,
      message: `TEST_DATABASE_URL database name looks like a placeholder (${database}). Use a real isolated PostgreSQL database.`,
    };
  }

  const username = decodeURIComponent(parsed.username);
  if (PLACEHOLDER_USERNAMES.has(username.toLowerCase())) {
    return {
      ok: false,
      message: `TEST_DATABASE_URL user looks like a placeholder (${username}). Use a real isolated PostgreSQL user.`,
    };
  }

  if (!parsed.username) {
    return {
      ok: false,
      message: "TEST_DATABASE_URL must include a database user.",
    };
  }

  return { ok: true, url: trimmed };
}

export function parsePostgresConnectionIdentity(
  url: string,
): PostgresConnectionIdentity | null {
  const validation = validateTestDatabaseUrl(url);
  if (!validation.ok) return null;

  try {
    const parsed = new URL(validation.url);
    const database = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
    return {
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      database,
      user: decodeURIComponent(parsed.username),
    };
  } catch {
    return null;
  }
}

/** Parsed once at module load; never derived from mutable process.env.DATABASE_URL. */
const ORIGINAL_PRIMARY_IDENTITY: PostgresConnectionIdentity | null = ORIGINAL_DATABASE_URL
  ? parsePostgresConnectionIdentity(ORIGINAL_DATABASE_URL)
  : null;

function identitiesMatch(
  left: PostgresConnectionIdentity,
  right: PostgresConnectionIdentity,
): boolean {
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.database === right.database &&
    left.user === right.user
  );
}

export function getOriginalPrimaryConnectionIdentity(): PostgresConnectionIdentity | null {
  return ORIGINAL_PRIMARY_IDENTITY;
}

export function assertTestDatabaseDistinctFromPrimary(testUrl: string): void {
  if (!ORIGINAL_PRIMARY_IDENTITY) return;

  const testIdentity = parsePostgresConnectionIdentity(testUrl);
  if (!testIdentity) return;

  if (identitiesMatch(testIdentity, ORIGINAL_PRIMARY_IDENTITY)) {
    throw new Error(
      "TEST_DATABASE_URL points to the same PostgreSQL database as the original DATABASE_URL (host, port, database, user). Use a disposable isolated test database.",
    );
  }
}

export function requireValidTestDatabaseUrl(): string {
  const validation = validateTestDatabaseUrl(TEST_DATABASE_URL);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  assertTestDatabaseDistinctFromPrimary(validation.url);
  return validation.url;
}

/** @deprecated Use shouldRunDatabaseBackedTests() */
export function hasConfiguredTestDatabase(): boolean {
  return validateTestDatabaseUrl(TEST_DATABASE_URL).ok;
}

export function getDatabaseTestsSkipReason(): string {
  if (!ATTD_RUN_DB_TESTS) {
    return "database-backed tests require ATTD_RUN_DB_TESTS=1";
  }

  const validation = validateTestDatabaseUrl(TEST_DATABASE_URL);
  if (!validation.ok) {
    return validation.message;
  }

  return "";
}

export function shouldRunDatabaseBackedTests(): boolean {
  return getDatabaseTestsSkipReason() === "";
}

export function enforceDatabaseTestPrerequisites(): void {
  const reason = getDatabaseTestsSkipReason();
  if (!reason) return;

  if (ATTD_RUN_DB_TESTS) {
    throw new Error(`Database-backed tests blocked: ${reason}`);
  }
}

let isolatedTestPrisma: PrismaClient | null = null;
let testEnvironmentBootstrapped = false;
let bootstrapPromise: Promise<PrismaClient> | null = null;

async function createIsolatedTestPrismaClient(url: string): Promise<PrismaClient> {
  const globalForPrisma = globalThis as { prisma?: PrismaClient };

  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => undefined);
    delete globalForPrisma.prisma;
  }

  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
  });

  globalForPrisma.prisma = client;
  process.env.DATABASE_URL = url;
  isolatedTestPrisma = client;
  testEnvironmentBootstrapped = true;
  return client;
}

/**
 * Prepare a single isolated Prisma client for database-backed tests.
 * Must run before dynamically importing modules that use @/lib/prisma.
 */
export async function bootstrapDatabaseTestEnvironment(): Promise<PrismaClient> {
  if (isolatedTestPrisma) return isolatedTestPrisma;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const url = requireValidTestDatabaseUrl();
    const client = await createIsolatedTestPrismaClient(url);
    try {
      await client.$connect();
    } catch (cause) {
      await client.$disconnect().catch(() => undefined);
      isolatedTestPrisma = null;
      testEnvironmentBootstrapped = false;
      bootstrapPromise = null;
      delete (globalThis as { prisma?: PrismaClient }).prisma;
      const detail = cause instanceof Error ? cause.message : String(cause);
      throw new Error(
        `Database-backed tests blocked: unable to connect to TEST_DATABASE_URL. ${detail}`,
        { cause },
      );
    }
    return client;
  })();

  try {
    return await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = null;
    throw error;
  } finally {
    if (isolatedTestPrisma) {
      bootstrapPromise = null;
    }
  }
}

export async function releaseDatabaseTestEnvironment(): Promise<void> {
  if (isolatedTestPrisma) {
    await isolatedTestPrisma.$disconnect().catch(() => undefined);
    isolatedTestPrisma = null;
  }

  bootstrapPromise = null;

  const globalForPrisma = globalThis as { prisma?: PrismaClient };
  delete globalForPrisma.prisma;
  testEnvironmentBootstrapped = false;

  if (ORIGINAL_DATABASE_URL) {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  } else {
    delete process.env.DATABASE_URL;
  }
}

/** @deprecated Use bootstrapDatabaseTestEnvironment() */
export async function resetPrismaTestClient(): Promise<PrismaClient> {
  return bootstrapDatabaseTestEnvironment();
}

export function isDatabaseTestEnvironmentBootstrapped(): boolean {
  return testEnvironmentBootstrapped;
}

export function getOriginalDatabaseUrl(): string {
  return ORIGINAL_DATABASE_URL;
}

export function uniqueTestKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @internal Seeds bootstrap state for harness unit tests without opening a DB connection. */
export function __harnessTestSeedBootstrappedClient(
  client: PrismaClient,
  runtimeUrl: string,
): void {
  isolatedTestPrisma = client;
  testEnvironmentBootstrapped = true;
  bootstrapPromise = null;
  process.env.DATABASE_URL = runtimeUrl;
  (globalThis as { prisma?: PrismaClient }).prisma = client;
}
