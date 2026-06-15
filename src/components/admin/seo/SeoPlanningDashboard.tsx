"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContentCluster } from "@/features/blog/content-clusters";
import type { BlogPostListItem } from "@/features/blog/types";
import type { SeoCampaign } from "@/features/blog/seo-planning-types";
import {
  calculatePlanningKpis,
  enrichCampaignsWithPosts,
  generateDemoSeoCampaigns,
  getCampaignProgressSummary,
} from "@/features/blog/seo-planning";
import { generateSeoCalendar } from "@/features/blog/seo-planning-calendar";
import {
  buildInternalLinkCoverage,
  generateSeoRecommendations,
} from "@/features/blog/seo-planning-recommendations";
import SeoPlanningKpis from "@/components/admin/seo/SeoPlanningKpis";
import SeoCampaignCard from "@/components/admin/seo/SeoCampaignCard";
import SeoCampaignSummary from "@/components/admin/seo/SeoCampaignSummary";
import SeoKanbanBoard from "@/components/admin/seo/SeoKanbanBoard";
import SeoPublishCalendar from "@/components/admin/seo/SeoPublishCalendar";
import SeoClusterProgress from "@/components/admin/seo/SeoClusterProgress";
import SeoInternalLinkCoverage from "@/components/admin/seo/SeoInternalLinkCoverage";
import SeoPlanningRecommendations from "@/components/admin/seo/SeoPlanningRecommendations";

type TabId = "board" | "calendar" | "progress" | "links" | "recommendations";

const TABS: { id: TabId; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "calendar", label: "Calendar" },
  { id: "progress", label: "Progress" },
  { id: "links", label: "Internal Links" },
  { id: "recommendations", label: "Recommendations" },
];

export default function SeoPlanningDashboard() {
  const [campaigns, setCampaigns] = useState<SeoCampaign[]>([]);
  const [clusters, setClusters] = useState<Map<string, ContentCluster>>(new Map());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("board");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/posts");
      const data = await res.json();
      const posts: BlogPostListItem[] = Array.isArray(data.posts) ? data.posts : [];

      const demo = generateDemoSeoCampaigns();
      const enriched = enrichCampaignsWithPosts(demo.campaigns, posts);
      setCampaigns(enriched);
      setClusters(demo.clusters);
      setSelectedCampaignId((prev) => prev ?? enriched[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  const selectedCluster = useMemo(
    () => (selectedCampaign ? clusters.get(selectedCampaign.id) : undefined),
    [clusters, selectedCampaign]
  );

  const kpis = useMemo(() => calculatePlanningKpis(campaigns), [campaigns]);

  const calendar = useMemo(
    () => (selectedCampaign ? generateSeoCalendar(selectedCampaign.items) : null),
    [selectedCampaign]
  );

  const progress = useMemo(
    () => (selectedCampaign ? getCampaignProgressSummary(selectedCampaign) : null),
    [selectedCampaign]
  );

  const linkCoverage = useMemo(
    () => (selectedCluster ? buildInternalLinkCoverage(selectedCluster) : null),
    [selectedCluster]
  );

  const recommendations = useMemo(() => {
    if (!selectedCampaign || !selectedCluster) return [];
    return generateSeoRecommendations(selectedCampaign, selectedCluster);
  }, [selectedCampaign, selectedCluster]);

  if (loading) {
    return <p className="admin-loading">Đang tải SEO Planning Board…</p>;
  }

  return (
    <div className="admin-seo-planning">
      <SeoPlanningKpis kpis={kpis} />

      <section className="admin-seo-campaigns-section">
        <h2 className="admin-subtitle">SEO Campaigns</h2>
        <div className="admin-seo-campaign-grid">
          {campaigns.map((campaign) => (
            <SeoCampaignCard
              key={campaign.id}
              campaign={campaign}
              selected={campaign.id === selectedCampaignId}
              onSelect={() => setSelectedCampaignId(campaign.id)}
            />
          ))}
        </div>
      </section>

      {selectedCampaign && selectedCluster && progress && linkCoverage && calendar && (
        <section className="admin-seo-campaign-detail">
          <SeoCampaignSummary campaign={selectedCampaign} />

          <div className="admin-seo-tabs" role="tablist">
            {TABS.map((tab) => (
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

          <div className="admin-seo-tab-panel">
            {activeTab === "board" && <SeoKanbanBoard campaign={selectedCampaign} />}
            {activeTab === "calendar" && (
              <SeoPublishCalendar calendar={calendar} campaign={selectedCampaign} />
            )}
            {activeTab === "progress" && (
              <SeoClusterProgress
                progress={progress}
                internalLinkCoverage={{
                  linked: linkCoverage.supportingLinkedToPillar,
                  total: linkCoverage.supportingTotal,
                }}
              />
            )}
            {activeTab === "links" && <SeoInternalLinkCoverage coverage={linkCoverage} />}
            {activeTab === "recommendations" && (
              <SeoPlanningRecommendations
                recommendations={recommendations}
                campaign={selectedCampaign}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
