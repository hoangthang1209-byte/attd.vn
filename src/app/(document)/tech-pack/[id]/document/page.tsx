import { notFound } from "next/navigation";
import { headers } from "next/headers";
import TechPackDocument from "@/components/tech-pack/TechPackDocument";
import TechPackPdfReady from "@/components/tech-pack/TechPackPdfReady";
import { getTechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { verifyTechPackPdfToken } from "@/features/tech-pack/pdf/tech-pack-pdf-token";
import { buildTechPackPdfDto } from "@/features/tech-pack/pdf/tech-pack-pdf.service";
import { resolveTechPackDocumentBaseUrl } from "@/features/tech-pack/pdf/tech-pack-pdf-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; pdfToken?: string }>;
};

export default async function TechPackDocumentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { mode, pdfToken } = await searchParams;

  if (mode !== "pdf" || !pdfToken || !verifyTechPackPdfToken(pdfToken, id)) {
    notFound();
  }

  const pack = await getTechPackDetail(id);
  if (!pack) notFound();

  const requestHeaders = await headers();
  const baseUrl = resolveTechPackDocumentBaseUrl(requestHeaders);
  const dto = await buildTechPackPdfDto(pack, baseUrl);

  return (
    <>
      <TechPackDocument data={dto} />
      <TechPackPdfReady />
    </>
  );
}
