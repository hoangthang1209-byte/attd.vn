import { prisma } from "@/lib/prisma";
import dataset from "@/data/administrative/vn-administrative-v2025.json";
import type {
  AdministrativeProvinceRecord,
  AdministrativeWardRecord,
} from "@/features/administrative/administrative.types";

type DatasetProvince = { code: string; name: string; sortOrder: number };
type DatasetWard = { code: string; provinceCode: string; name: string; sortOrder: number };

function mapProvince(row: {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}): AdministrativeProvinceRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sortOrder,
  };
}

function mapWard(row: {
  id: string;
  code: string;
  provinceId: string;
  name: string;
  sortOrder: number;
}): AdministrativeWardRecord {
  return {
    id: row.id,
    code: row.code,
    provinceId: row.provinceId,
    name: row.name,
    sortOrder: row.sortOrder,
  };
}

export async function seedAdministrativeDivisionsIfEmpty(): Promise<{
  skipped: boolean;
  provincesCreated: number;
  wardsCreated: number;
}> {
  const existing = await prisma.administrativeProvince.count();
  if (existing > 0) {
    return { skipped: true, provincesCreated: 0, wardsCreated: 0 };
  }

  const provinces = dataset.provinces as DatasetProvince[];
  const wards = dataset.wards as DatasetWard[];
  const provinceIdByCode = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const province of provinces) {
      const created = await tx.administrativeProvince.create({
        data: {
          code: province.code,
          name: province.name,
          sortOrder: province.sortOrder,
        },
      });
      provinceIdByCode.set(province.code, created.id);
    }

    const wardCreates = wards
      .map((ward) => {
        const provinceId = provinceIdByCode.get(ward.provinceCode);
        if (!provinceId) return null;
        return {
          code: ward.code,
          provinceId,
          name: ward.name,
          sortOrder: ward.sortOrder,
        };
      })
      .filter((row): row is { code: string; provinceId: string; name: string; sortOrder: number } =>
        Boolean(row),
      );

    const batchSize = 500;
    for (let i = 0; i < wardCreates.length; i += batchSize) {
      await tx.administrativeWard.createMany({
        data: wardCreates.slice(i, i + batchSize),
      });
    }
  });

  return {
    skipped: false,
    provincesCreated: provinces.length,
    wardsCreated: wards.length,
  };
}

export async function listAdministrativeProvinces(search?: string): Promise<AdministrativeProvinceRecord[]> {
  await seedAdministrativeDivisionsIfEmpty();
  const where = search?.trim()
    ? {
        name: { contains: search.trim(), mode: "insensitive" as const },
      }
    : undefined;

  const rows = await prisma.administrativeProvince.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 200,
  });
  return rows.map(mapProvince);
}

export async function listAdministrativeWards(
  provinceId: string,
  search?: string,
): Promise<AdministrativeWardRecord[]> {
  await seedAdministrativeDivisionsIfEmpty();
  const where: {
    provinceId: string;
    name?: { contains: string; mode: "insensitive" };
  } = { provinceId };
  if (search?.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  const rows = await prisma.administrativeWard.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 500,
  });
  return rows.map(mapWard);
}

export async function getAdministrativeProvinceById(
  provinceId: string,
): Promise<AdministrativeProvinceRecord | null> {
  const row = await prisma.administrativeProvince.findUnique({ where: { id: provinceId } });
  return row ? mapProvince(row) : null;
}

export async function getAdministrativeWardById(
  wardId: string,
): Promise<AdministrativeWardRecord | null> {
  const row = await prisma.administrativeWard.findUnique({ where: { id: wardId } });
  return row ? mapWard(row) : null;
}

export async function resolveCustomerAddressSnapshots(input: {
  provinceId?: string | null;
  wardId?: string | null;
  provinceNameSnapshot?: string | null;
  wardNameSnapshot?: string | null;
}) {
  let provinceNameSnapshot = input.provinceNameSnapshot?.trim() || null;
  let wardNameSnapshot = input.wardNameSnapshot?.trim() || null;

  if (input.provinceId) {
    const province = await getAdministrativeProvinceById(input.provinceId);
    if (province) provinceNameSnapshot = province.name;
  }

  if (input.wardId) {
    const ward = await getAdministrativeWardById(input.wardId);
    if (ward) {
      wardNameSnapshot = ward.name;
      if (!input.provinceId) {
        const province = await getAdministrativeProvinceById(ward.provinceId);
        if (province) provinceNameSnapshot = province.name;
      }
    }
  }

  return { provinceNameSnapshot, wardNameSnapshot };
}
