"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { MediaDashboardSnapshot } from "@/features/media/intelligence/intelligence.types";

export default function MediaIntelligenceDashboardClient() {
  const [data, setData] = useState<MediaDashboardSnapshot | null>(null);
  const [lifecycle, setLifecycle] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, lifeRes] = await Promise.all([
          fetch("/api/media/intelligence/dashboard"),
          fetch("/api/media/lifecycle?dashboard=1"),
        ]);
        const json = (await dashRes.json()) as MediaDashboardSnapshot & { message?: string };
        const lifeJson = (await lifeRes.json()) as {
          counts?: Record<string, number>;
          message?: string;
        };
        if (!dashRes.ok) throw new Error(json.message || "Không tải được dashboard");
        if (!cancelled) {
          setData(json);
          setLifecycle(lifeJson.counts ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AdminPageTitle title="Media Dashboard" />
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/admin/media" className="admin-btn admin-btn--secondary">
          Thư viện
        </Link>
        <Link href="/admin/media/inbox" className="admin-btn admin-btn--secondary">
          Incoming / Review
        </Link>
        <Link href="/admin/media/lifecycle" className="admin-btn admin-btn--secondary">
          Lifecycle
        </Link>
        <Link href="/admin/content/media-coverage" className="admin-btn admin-btn--secondary">
          Độ phủ hình ảnh
        </Link>
      </div>

      {loading ? <InlineLoading title="Đang tải..." /> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {data ? (
        <div style={{ display: "grid", gap: 20 }}>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {[
              ["Assets", data.totals.assets],
              ["Public", data.totals.publicAssets],
              ["Needs review", data.totals.needsReview],
              ["Missing alt", data.totals.missingAlt],
              ["Duplicates", data.totals.duplicates],
              ["Unused", data.totals.unused],
              ["Low SEO", data.totals.lowSeo],
              ["7 ngày gần đây", data.totals.recentlyUploaded],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 14px",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </section>

          {data.canonicalCoverage ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Canonical media migration (14.7)</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Overall %", `${data.canonicalCoverage.overallMigrationPercent}%`],
                  ["Category %", `${data.canonicalCoverage.categoryPercent}%`],
                  ["Case Study %", `${data.canonicalCoverage.caseStudyPercent}%`],
                  ["Product %", `${data.canonicalCoverage.productPercent}%`],
                  ["Broken URLs", data.canonicalCoverage.brokenUrlCount],
                  ["Missing MediaAsset", data.canonicalCoverage.mediaAssetMissingCount],
                  [
                    "Cat canonical/legacy",
                    `${data.canonicalCoverage.category.canonical}/${data.canonicalCoverage.category.legacyOnly}`,
                  ],
                  [
                    "CS canonical/legacy",
                    `${data.canonicalCoverage.caseStudy.canonical}/${data.canonicalCoverage.caseStudy.legacyOnly}`,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>AI processing</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {Object.entries(data.byAiStatus).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Visibility</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {Object.entries(data.byVisibility).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {lifecycle ? (
            <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
                Lifecycle{" "}
                <Link href="/admin/media/lifecycle" style={{ fontSize: 12, fontWeight: 400 }}>
                  Open queues
                </Link>
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                }}
              >
                {(
                  [
                    ["active", "Active"],
                    ["reviewRequired", "Review"],
                    ["deprecated", "Deprecated"],
                    ["archived", "Archived"],
                    ["retired", "Retired"],
                    ["replacementPending", "Replace pending"],
                    ["rightsExpiring", "Rights expiring"],
                    ["rightsExpired", "Rights expired"],
                    ["unknownRightsPublic", "Unknown rights"],
                    ["unused", "Unused"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{lifecycle[key] ?? 0}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Bundle coverage gaps</h3>
            {data.coverageGaps.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Không có gap bắt buộc.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {data.coverageGaps.map((gap) => (
                  <li key={gap.bundleId}>
                    <Link href={`/admin/content/media-bundles/${gap.bundleId}`}>
                      {gap.name}
                    </Link>
                    {" — thiếu "}
                    {gap.gaps.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, background: "#fff" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Top used</h3>
            {data.topUsed.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Chưa có assignment.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {data.topUsed.map((row) => (
                  <li key={row.mediaAssetId}>
                    {row.title || row.mediaAssetId} — {row.uses} uses
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ fontSize: 13, color: "#6b7280" }}>
            Quick filters:{" "}
            <Link href="/admin/media?hasAltText=0">Missing alt</Link>
            {" · "}
            <Link href="/admin/media?unusedOnly=1">Unused</Link>
            {" · "}
            <Link href="/admin/media?maximumSeoScore=49">Low SEO</Link>
            {" · "}
            <Link href="/admin/media?recentlyUploadedDays=7">Recently uploaded</Link>
            {" · "}
            <Link href="/admin/media?duplicateStatus=POSSIBLE_DUPLICATE">Duplicates</Link>
          </section>
        </div>
      ) : null}
    </>
  );
}
