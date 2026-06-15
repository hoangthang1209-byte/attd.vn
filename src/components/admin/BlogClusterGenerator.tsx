"use client";

import { useMemo, useState } from "react";
import type { ClusterArticle, ContentCluster } from "@/features/blog/content-clusters";
import {
  CLUSTER_EXAMPLES,
  generateCluster,
  generateInternalLinkMap,
  generatePublishOrder,
} from "@/features/blog/content-clusters";
import type { ClusterType } from "@/features/blog/content-clusters-types";
import { CLUSTER_TYPE_META } from "@/features/blog/cluster-handoff";
import { calculateClusterScore } from "@/features/blog/cluster-score";

type BlogClusterGeneratorProps = {
  onCreateArticle: (article: ClusterArticle, clusterType: ClusterType) => void;
  onMessage: (text: string, type: "success" | "error") => void;
};

function priorityBadgeClass(priority: ClusterArticle["priorityLabel"]): string {
  if (priority === "high") return "admin-cluster-priority--high";
  if (priority === "medium") return "admin-cluster-priority--medium";
  return "admin-cluster-priority--low";
}

function priorityLabelVi(priority: ClusterArticle["priorityLabel"]): string {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

export default function BlogClusterGenerator({
  onCreateArticle,
  onMessage,
}: BlogClusterGeneratorProps) {
  const [keyword, setKeyword] = useState("");
  const [clusterType, setClusterType] = useState<ClusterType>("source-supplier");
  const [cluster, setCluster] = useState<ContentCluster | null>(null);

  const linkMap = useMemo(
    () => (cluster ? generateInternalLinkMap(cluster) : null),
    [cluster]
  );
  const roadmap = useMemo(
    () => (cluster ? generatePublishOrder(cluster) : null),
    [cluster]
  );
  const score = useMemo(() => {
    if (!cluster || !linkMap) return null;
    return calculateClusterScore(cluster, linkMap);
  }, [cluster, linkMap]);

  function handleGenerate() {
    if (!keyword.trim()) {
      onMessage("Vui lòng nhập từ khóa cụm nội dung.", "error");
      return;
    }
    setCluster(generateCluster(keyword, clusterType));
    onMessage("Đã tạo cụm nội dung SEO.", "success");
  }

  function handleUseExample(example: (typeof CLUSTER_EXAMPLES)[number]) {
    setKeyword(example.keyword);
    setClusterType(example.type);
    setCluster(generateCluster(example.keyword, example.type));
    onMessage(`Đã tải ví dụ: ${example.label}`, "success");
  }

  function handleCreateArticle(article: ClusterArticle) {
    if (!cluster) return;
    onCreateArticle(article, cluster.clusterType);
    onMessage(`Đang tạo bài: ${article.title}`, "success");
  }

  return (
    <div className="admin-cluster-generator">
      <div className="admin-cluster-generator-header">
        <h3 className="admin-cluster-generator-title">Content Cluster Generator</h3>
        <p className="admin-field-hint">
          Biến một từ khóa thành cụm SEO B2B gồm bài trụ cột, bài hỗ trợ, lộ trình xuất bản và
          sơ đồ internal link.
        </p>
      </div>

      <div className="admin-cluster-generator-form">
        <div className="admin-field">
          <label className="admin-label" htmlFor="cluster-keyword">
            Từ khóa cụm <span className="admin-required">*</span>
          </label>
          <input
            id="cluster-keyword"
            className="admin-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Ví dụ: Nguồn hàng áo thun trơn"
          />
        </div>

        <div className="admin-field">
          <label className="admin-label" htmlFor="cluster-type">
            Cluster Type
          </label>
          <select
            id="cluster-type"
            className="admin-input"
            value={clusterType}
            onChange={(e) => setClusterType(e.target.value as ClusterType)}
          >
            {(Object.keys(CLUSTER_TYPE_META) as ClusterType[]).map((type) => (
              <option key={type} value={type}>
                {CLUSTER_TYPE_META[type].label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-cluster-generator-actions">
          <button type="button" className="admin-btn admin-btn--primary" onClick={handleGenerate}>
            Generate Cluster
          </button>
          <div className="admin-cluster-examples">
            <span className="admin-field-hint">Use Example:</span>
            {CLUSTER_EXAMPLES.map((example) => (
              <button
                key={example.type}
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => handleUseExample(example)}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {cluster && score && linkMap && roadmap && (
        <div className="admin-cluster-results">
          <div className="admin-cluster-score-card">
            <p className="admin-cluster-score-label">Cluster Score</p>
            <p className={`admin-cluster-score-value admin-cluster-score-value--${score.level}`}>
              {score.score}/100 — {score.label}
            </p>
            <ul className="admin-cluster-score-metrics">
              <li>{score.articleCount} bài viết</li>
              <li>{score.internalLinkCount} internal links</li>
              <li>Pillar coverage: {score.pillarCoverage}%</li>
              <li>Keyword coverage: {score.keywordCoverage}%</li>
            </ul>
          </div>

          <div className="admin-cluster-overview">
            <h4 className="admin-cluster-section-title">Topic Cluster: {cluster.topic}</h4>

            <div className="admin-cluster-tree">
              <div className="admin-cluster-tree-pillar">
                <div className="admin-cluster-article-row admin-cluster-article-row--pillar">
                  <div className="admin-cluster-article-main">
                    <span className="admin-cluster-node-tag">PILLAR</span>
                    <strong>{cluster.pillar.title}</strong>
                    <p className="admin-field-hint">
                      {cluster.pillar.keyword} · {cluster.pillar.intent}
                    </p>
                  </div>
                  <span
                    className={`admin-cluster-priority ${priorityBadgeClass(cluster.pillar.priorityLabel)}`}
                  >
                    {priorityLabelVi(cluster.pillar.priorityLabel)}
                  </span>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => handleCreateArticle(cluster.pillar)}
                  >
                    Tạo bài viết
                  </button>
                </div>
              </div>

              <ul className="admin-cluster-tree-supporting">
                {cluster.supporting.map((article) => (
                  <li key={article.id} className="admin-cluster-article-row">
                    <div className="admin-cluster-article-main">
                      <span className="admin-cluster-node-tag">SUPPORTING</span>
                      <strong>{article.title}</strong>
                      <p className="admin-field-hint">
                        {article.keyword} · {article.intent}
                      </p>
                    </div>
                    <span
                      className={`admin-cluster-priority ${priorityBadgeClass(article.priorityLabel)}`}
                    >
                      {priorityLabelVi(article.priorityLabel)}
                    </span>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--small"
                      onClick={() => handleCreateArticle(article)}
                    >
                      Tạo bài viết
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="admin-cluster-link-map">
            <h4 className="admin-cluster-section-title">Internal Link Map</h4>
            <div className="admin-cluster-link-grid">
              {linkMap.edges.map((edge) => (
                <div key={`${edge.fromId}-${edge.toId}`} className="admin-cluster-link-card">
                  <p className="admin-cluster-link-from">{edge.fromTitle}</p>
                  <p className="admin-cluster-link-arrow">→ links to →</p>
                  <p className="admin-cluster-link-to">{edge.toTitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-cluster-roadmap">
            <h4 className="admin-cluster-section-title">Publish Roadmap</h4>
            {roadmap.weeks.map((week) => (
              <div key={week.week} className="admin-cluster-roadmap-week">
                <p className="admin-cluster-roadmap-week-label">{week.label}</p>
                <ul className="admin-cluster-roadmap-list">
                  {week.articles.map((article, index) => (
                    <li key={article.id}>
                      {week.week === 1 ? index + 1 : index + 1}. {article.title}
                      <span
                        className={`admin-cluster-priority ${priorityBadgeClass(article.priorityLabel)}`}
                      >
                        {priorityLabelVi(article.priorityLabel)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
