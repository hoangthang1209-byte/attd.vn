import AdminShell from "@/components/admin/AdminShell";
import KnowledgeBaseDashboard from "@/components/admin/knowledge-base/KnowledgeBaseDashboard";
import {
  ensureDefaultKnowledgeCategories,
  getKnowledgeBaseKpisFromDb,
  listKnowledgeBaseEntries,
} from "@/features/knowledge-base/knowledge-base-seed";
import {
  calculateKnowledgeCompleteness,
  getCompletenessLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  await ensureDefaultKnowledgeCategories();
  const [{ entries }, kpis] = await Promise.all([
    listKnowledgeBaseEntries({ pageSize: 50 }),
    getKnowledgeBaseKpisFromDb(),
  ]);

  const enrichedEntries = entries.map((entry) => {
    const completenessScore = calculateKnowledgeCompleteness(entry);
    return {
      ...entry,
      completenessScore,
      completenessLabel: getCompletenessLabel(completenessScore),
    };
  });

  return (
    <AdminShell title="Knowledge Base — Dữ liệu doanh nghiệp">
      <KnowledgeBaseDashboard initialEntries={enrichedEntries} initialKpis={kpis} />
    </AdminShell>
  );
}
