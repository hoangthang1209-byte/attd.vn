import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Prisma, type LeadSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import {
  crmOwnerValidationDeps,
  resetCrmOwnerValidationDeps,
} from "@/features/crm/services/crm-owner-validation.deps";
import { intakeLead } from "@/features/crm/services/lead-intake.service";
import { updateCrmLead } from "@/features/crm/services/crm-lead.service";

const existingLeadRow = {
  id: "lead-existing",
  source: "GMAIL" as const,
  sourceRef: "gmail-msg-1",
  assignedTo: null,
  fullName: "Existing Lead",
  phone: "0900000000",
  email: null,
  status: "NEW" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mappedLead = {
  id: "lead-existing",
  fullName: "Existing Lead",
  phone: "0900000000",
  email: null,
  source: "GMAIL" as const,
  status: "NEW" as const,
  code: "L-000001",
  company: null,
  companyName: null,
  contactName: "Existing Lead",
  zalo: null,
  sourceDetail: null,
  sourceRef: "gmail-msg-1",
  receivedAt: null,
  intakeMetadata: null,
  demand: null,
  message: null,
  note: null,
  priority: "NORMAL" as const,
  followUpAt: null,
  nextFollowUpAt: null,
  estimatedValue: null,
  assignedTo: null,
  customerId: null,
  contactId: null,
  convertedAt: null,
  landingPage: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  referrer: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: [],
  productInterests: [],
  activities: [],
};

type PrismaLead = typeof prisma.lead;

describe("intakeLead service integration", () => {
  let originalFindFirst: PrismaLead["findFirst"];
  let originalFindUnique: PrismaLead["findUnique"];
  let originalCount: PrismaLead["count"];
  let originalTransaction: typeof prisma.$transaction;
  let originalQueryRaw: typeof prisma.$queryRaw;

  beforeEach(() => {
    originalFindFirst = prisma.lead.findFirst;
    originalFindUnique = prisma.lead.findUnique;
    originalCount = prisma.lead.count;
    originalTransaction = prisma.$transaction;
    originalQueryRaw = prisma.$queryRaw;

    prisma.lead.findFirst = (async () => null) as unknown as PrismaLead["findFirst"];
    prisma.lead.findUnique = (async () => mappedLead) as unknown as PrismaLead["findUnique"];
    prisma.lead.count = (async () => 0) as unknown as PrismaLead["count"];
    prisma.$queryRaw = (async () => [{ "?column?": 1 }]) as unknown as typeof prisma.$queryRaw;
    resetCrmOwnerValidationDeps();
  });

  afterEach(() => {
    prisma.lead.findFirst = originalFindFirst;
    prisma.lead.findUnique = originalFindUnique;
    prisma.lead.count = originalCount;
    prisma.$transaction = originalTransaction;
    prisma.$queryRaw = originalQueryRaw;
    resetCrmOwnerValidationDeps();
  });

  it("returns existing lead on idempotent replay before validating invalid owner", async () => {
    let employeeLookupCount = 0;
    prisma.lead.findFirst = (async () => existingLeadRow) as unknown as PrismaLead["findFirst"];
    crmOwnerValidationDeps.getEmployeeById = async () => {
      employeeLookupCount += 1;
      return null;
    };

    const result = await intakeLead({
      channel: "GMAIL",
      source: "GMAIL" as LeadSource,
      sourceRef: "gmail-msg-1",
      assignedSalesId: "invalid-owner-id",
      phone: "0900000000",
    });

    assert.ok(result);
    assert.equal(result.created, false);
    assert.equal(result.matchedBy, "source_ref");
    assert.equal(result.lead.id, "lead-existing");
    assert.equal(employeeLookupCount, 0);
  });

  it("re-fetches existing lead on P2002 race after create attempt", async () => {
    let findFirstCalls = 0;
    prisma.lead.findFirst = (async () => {
      findFirstCalls += 1;
      return findFirstCalls === 1 ? null : existingLeadRow;
    }) as unknown as PrismaLead["findFirst"];
    prisma.$transaction = (async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "6.9.0",
      });
    }) as unknown as typeof prisma.$transaction;

    const result = await intakeLead({
      channel: "GMAIL",
      source: "GMAIL" as LeadSource,
      sourceRef: "gmail-msg-1",
      phone: "0900000000",
    });

    assert.ok(result);
    assert.equal(result.created, false);
    assert.equal(result.matchedBy, "source_ref");
    assert.equal(findFirstCalls, 2);
  });

  it("rejects explicit invalid owner on create path", async () => {
    let transactionCalls = 0;
    prisma.$transaction = (async () => {
      transactionCalls += 1;
      return { id: "new-lead" };
    }) as unknown as typeof prisma.$transaction;
    crmOwnerValidationDeps.getEmployeeById = async () => null;

    await assert.rejects(
      () =>
        intakeLead({
          channel: "MANUAL",
          source: "MANUAL" as LeadSource,
          assignedSalesId: "missing-employee",
          phone: "0900000000",
        }),
      (err: unknown) => err instanceof LeadIntakeValidationError
    );

    assert.equal(transactionCalls, 0);
  });
});

describe("updateCrmLead owner-change audit", () => {
  let originalFindUnique: PrismaLead["findUnique"];
  let originalTransaction: typeof prisma.$transaction;
  let originalQueryRaw: typeof prisma.$queryRaw;

  beforeEach(() => {
    originalFindUnique = prisma.lead.findUnique;
    originalTransaction = prisma.$transaction;
    originalQueryRaw = prisma.$queryRaw;

    prisma.$queryRaw = (async () => [{ "?column?": 1 }]) as unknown as typeof prisma.$queryRaw;
    resetCrmOwnerValidationDeps();
  });

  afterEach(() => {
    prisma.lead.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
    prisma.$queryRaw = originalQueryRaw;
    resetCrmOwnerValidationDeps();
  });

  it("creates owner-change audit activity when assignedTo changes", async () => {
    let findUniqueCalls = 0;
    prisma.lead.findUnique = (async () => {
      findUniqueCalls += 1;
      if (findUniqueCalls === 1) {
        return {
          id: "lead-1",
          assignedTo: "emp-1",
          status: "NEW",
          fullName: "Lead",
        };
      }
      return { ...mappedLead, id: "lead-1", assignedTo: "emp-2" };
    }) as unknown as PrismaLead["findUnique"];

    crmOwnerValidationDeps.getEmployeeById = async (id: string) => ({
      id,
      fullName: id === "emp-1" ? "Alice" : "Bob",
      isActive: true,
      role: "SALES" as const,
      employeeCode: "NV-000001",
      jobTitle: null,
      department: null,
      phone: null,
      email: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activityCreates: unknown[] = [];
    prisma.$transaction = (async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        lead: {
          update: async () => ({ id: "lead-1", assignedTo: "emp-2" }),
        },
        cRMActivity: {
          create: async (args: unknown) => {
            activityCreates.push(args);
            return args;
          },
        },
      };
      return fn(tx);
    }) as unknown as typeof prisma.$transaction;

    const result = await updateCrmLead("lead-1", { assignedTo: "emp-2" });

    assert.ok(result);
    assert.equal(activityCreates.length, 1);
    const audit = activityCreates[0] as { data: { title: string; content: string } };
    assert.equal(audit.data.title, "Thay đổi phụ trách sales");
    assert.equal(audit.data.content, "Alice → Bob");
  });
});
