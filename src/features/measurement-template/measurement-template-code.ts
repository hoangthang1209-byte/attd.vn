import { prisma } from "@/lib/prisma";

export async function generateMeasurementTemplateCode(): Promise<string> {
  const rows = await prisma.measurementTemplate.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.code.match(/^MT-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `MT-${String(max + 1).padStart(5, "0")}`;
}
