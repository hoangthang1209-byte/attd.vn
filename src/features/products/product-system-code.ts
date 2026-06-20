import { prisma } from "@/lib/prisma";

const SYSTEM_CODE_PATTERN = /^SP-(\d+)$/;

export function formatProductSystemCode(sequence: number): string {
  return `SP-${String(sequence).padStart(6, "0")}`;
}

export function parseProductSystemCodeSequence(code: string): number | null {
  const match = code.trim().toUpperCase().match(SYSTEM_CODE_PATTERN);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export async function getMaxProductSystemCodeSequence(): Promise<number> {
  const rows = await prisma.product.findMany({
    where: { systemCode: { not: null } },
    select: { systemCode: true },
  });
  let max = 0;
  for (const row of rows) {
    if (!row.systemCode) continue;
    const seq = parseProductSystemCodeSequence(row.systemCode);
    if (seq != null) max = Math.max(max, seq);
  }
  return max;
}

export async function generateProductSystemCode(): Promise<string> {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const next = (await getMaxProductSystemCodeSequence()) + 1;
    const code = formatProductSystemCode(next);
    const existing = await prisma.product.findUnique({ where: { systemCode: code } });
    if (!existing) return code;
  }
  throw new Error("Không thể tạo mã hệ thống sản phẩm.");
}

export async function ensureProductSystemCode(productId: string): Promise<string> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { systemCode: true },
  });
  if (!product) throw new Error("Không tìm thấy sản phẩm.");
  if (product.systemCode) return product.systemCode;

  const systemCode = await generateProductSystemCode();
  await prisma.product.update({
    where: { id: productId },
    data: { systemCode },
  });
  return systemCode;
}
