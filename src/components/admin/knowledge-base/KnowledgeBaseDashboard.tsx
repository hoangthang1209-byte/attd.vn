"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { KnowledgeBaseEntryRecord, KnowledgeBaseKpis } from "@/features/knowledge-base/knowledge-base-types";
import KnowledgeBaseKpisPanel from "@/components/admin/knowledge-base/KnowledgeBaseKpis";
import KnowledgeBaseFilters from "@/components/admin/knowledge-base/KnowledgeBaseFilters";
import KnowledgeBaseEntryList from "@/components/admin/knowledge-base/KnowledgeBaseEntryList";
import KnowledgeBaseEmptyState from "@/components/admin/knowledge-base/KnowledgeBaseEmptyState";
import KnowledgeBaseCategoryManager from "@/components/admin/knowledge-base/KnowledgeBaseCategoryManager";
import KnowledgeBaseContextPreview from "@/components/admin/knowledge-base/KnowledgeBaseContextPreview";
import KnowledgeBaseStarterImport from "@/components/admin/knowledge-base/KnowledgeBaseStarterImport";
import KnowledgeBaseBulkToolbar from "@/components/admin/knowledge-base/KnowledgeBaseBulkToolbar";
import KnowledgeBaseEditorialReadiness from "@/components/admin/knowledge-base/KnowledgeBaseEditorialReadiness";
import { AdminLoadingState } from "@/components/admin/AdminUi";

type TabId = "entries" | "categories" | "context" | "starter" | "health";

type Props = {
  initialEntries: KnowledgeBaseEntryRecord[];
  initialKpis: KnowledgeBaseKpis;
};

export default function KnowledgeBaseDashboard({ initialEntries, initialKpis }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("entries");
  const [entries, setEntries] = useState(initialEntries);
  const [kpis, setKpis] = useState(initialKpis);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    type: "",
    status: "",
    usageScope: "",
    priority: "",
    verifiedOnly: false,
    needsImprovement: false,
    aiReadinessFilter: "",
    governanceFilter: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).get("governanceFilter");
    if (fromUrl) {
      setFilters((prev) => ({ ...prev, governanceFilter: fromUrl }));
      setActiveTab("entries");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.usageScope) params.set("usageScope", filters.usageScope);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.verifiedOnly) params.set("verifiedOnly", "1");
      if (filters.needsImprovement) params.set("needsImprovement", "1");
      if (filters.aiReadinessFilter) params.set("aiReadinessFilter", filters.aiReadinessFilter);
      if (filters.governanceFilter) params.set("governanceFilter", filters.governanceFilter);

      const res = await fetch(`/api/admin/knowledge-base?${params.toString()}`);
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      if (data.kpis) setKpis(data.kpis);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? entries.map((entry) => entry.id) : []);
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "entries", label: "Dữ liệu doanh nghiệp" },
    { id: "health", label: "Sẵn sàng biên tập" },
    { id: "categories", label: "Danh mục" },
    { id: "context", label: "Xem dữ liệu AI sẽ dùng" },
    { id: "starter", label: "Nhập dữ liệu mẫu ATTD" },
  ];

  return (
    <div className="admin-kb-dashboard">
      <div className="admin-kb-toolbar">
        <KnowledgeBaseKpisPanel kpis={kpis} />
        <div className="admin-kb-toolbar-actions">
          <Link href="/admin/knowledge-base/import" className="admin-btn admin-btn--secondary">
            Nhập dữ liệu hàng loạt
          </Link>
          <Link href="/admin/knowledge-base/context-preview" className="admin-btn admin-btn--secondary">
            Xem trước ngữ cảnh AI
          </Link>
          <Link href="/admin/knowledge-base/new" className="admin-btn admin-btn--primary">
            + Thêm dữ liệu
          </Link>
        </div>
      </div>

      <div className="admin-seo-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`admin-seo-tab ${activeTab === tab.id ? "admin-seo-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-kb-tab-panel">
        {activeTab === "entries" && (
          <>
            <KnowledgeBaseFilters filters={filters} onChange={setFilters} />
            <KnowledgeBaseBulkToolbar
              selectedIds={selectedIds}
              onChanged={load}
              onClear={() => setSelectedIds([])}
            />
            {loading ? (
              <AdminLoadingState label="Đang tải mục Knowledge Base…" />
            ) : entries.length === 0 ? (
              <KnowledgeBaseEmptyState onImported={load} />
            ) : (
              <KnowledgeBaseEntryList
                entries={entries}
                onChanged={load}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
              />
            )}
          </>
        )}
        {activeTab === "health" && <KnowledgeBaseEditorialReadiness />}
        {activeTab === "categories" && <KnowledgeBaseCategoryManager />}
        {activeTab === "context" && <KnowledgeBaseContextPreview />}
        {activeTab === "starter" && <KnowledgeBaseStarterImport onImported={load} />}
      </div>
    </div>
  );
}
