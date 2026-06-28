import { prisma } from "@/lib/prisma";

export async function generateTechPackCode(): Promise<string> {
  const rows = await prisma.techPack.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.code.match(/^TP-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `TP-${String(max + 1).padStart(6, "0")}`;
}
