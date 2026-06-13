import { prisma } from "@/lib/prisma";
import {
  CLIENT_LOGOS as staticLogos,
  type VisibleClientLogo,
} from "@/lib/clientLogos";
import { resolveUploadImage, isValidImageSrc } from "@/lib/imagePaths";

export async function listClientLogos() {
  return prisma.clientLogoRecord.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getClientLogoById(id: string) {
  return prisma.clientLogoRecord.findUnique({ where: { id } });
}

export async function createClientLogo(data: {
  companyName: string;
  website?: string;
  imageUrl: string;
  isVisible?: boolean;
  sortOrder?: number;
}) {
  return prisma.clientLogoRecord.create({ data });
}

export async function updateClientLogo(
  id: string,
  data: Partial<{
    companyName: string;
    website: string | null;
    imageUrl: string;
    isVisible: boolean;
    sortOrder: number;
  }>
) {
  return prisma.clientLogoRecord.update({ where: { id }, data });
}

export async function deleteClientLogo(id: string) {
  return prisma.clientLogoRecord.delete({ where: { id } });
}

export async function getVisibleClientLogosFromDb(): Promise<VisibleClientLogo[]> {
  try {
    const rows = await prisma.clientLogoRecord.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (rows.length === 0) return getStaticVisibleClientLogos();

    return rows
      .filter((row) => isValidImageSrc(row.imageUrl))
      .map((row) => ({
        id: row.id,
        image: row.imageUrl,
        companyName: row.companyName,
        website: row.website ?? undefined,
        isVisible: row.isVisible,
        imageSrc: row.imageUrl,
      }));
  } catch {
    return getStaticVisibleClientLogos();
  }
}

function getStaticVisibleClientLogos(): VisibleClientLogo[] {
  return staticLogos
    .filter((entry) => entry.isVisible)
    .map((entry) => {
      const imageSrc = resolveUploadImage("clients", entry.image);
      if (!imageSrc) return null;
      return { ...entry, imageSrc };
    })
    .filter((entry): entry is VisibleClientLogo => entry != null);
}

export async function countClientLogos() {
  try {
    return await prisma.clientLogoRecord.count();
  } catch {
    return 0;
  }
}
