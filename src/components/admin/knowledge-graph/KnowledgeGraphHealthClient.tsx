"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

export default function KnowledgeGraphHealthClient() {
  const toast = useAdminToast();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/knowledge-graph/health");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Failed");
        return;
      }
      setHealth(json.health);
    })();
  }, [toast]);

  if (!health) return <p>Loading health…</p>;

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
      </p>
      <pre
        style={{
          background: "#f6f4ef",
          padding: 16,
          borderRadius: 8,
          overflow: "auto",
          fontSize: 12,
        }}
      >
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}
