import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";
import KnowledgeBaseEntryCard from "@/components/admin/knowledge-base/KnowledgeBaseEntryCard";

type Props = {
  entries: KnowledgeBaseEntryRecord[];
  onChanged: () => void;
};

export default function KnowledgeBaseEntryList({ entries, onChanged }: Props) {
  return (
    <div className="admin-kb-entry-grid">
      {entries.map((entry) => (
        <KnowledgeBaseEntryCard key={entry.id} entry={entry} onChanged={onChanged} />
      ))}
    </div>
  );
}
