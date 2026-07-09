"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminLoadingState, AdminPageShell, DataToolbar, EmptyState, PageHeader } from "@/components/admin/AdminUi";
import { ADMIN_SEARCH_ENTITY_LABELS, ADMIN_SEARCH_TYPE_BADGES } from "@/features/admin-search/labels";
import type { AdminSearchEntityType, AdminSearchResponse, AdminSearchResult } from "@/features/admin-search/types";
import { formatQuoteCurrency, formatQuoteDateTime } from "@/features/quotes/format";

const GROUP_ORDER: AdminSearchEntityType[] = [
  "OPPORTUNITY",
  "LEAD",
  "CUSTOMER",
  "CONTACT",
  "QUOTE",
  "PRICING",
  "ORDER",
  "PRODUCT",
  "VARIANT",
  "TECH_PACK",
];

const EMPTY_RESPONSE: AdminSearchResponse = {
  query: "",
  results: [],
  grouped: {
    OPPORTUNITY: [],
    LEAD: [],
    CUSTOMER: [],
    CONTACT: [],
    QUOTE: [],
    PRICING: [],
    ORDER: [],
    PRODUCT: [],
    VARIANT: [],
    TECH_PACK: [],
  },
};

function ResultRow({ item }: { item: AdminSearchResult }) {
  return (
    <li className="admin-search__row">
      <Link href={item.href} className="admin-search__row-link">
        <span className="admin-search__badge">{ADMIN_SEARCH_TYPE_BADGES[item.type]}</span>
        <div className="admin-search__main">
          <p className="admin-search__label">{item.label}</p>
          <p className="admin-search__meta">
            {item.code ? <code>{item.code}</code> : null}
            {item.subtitle ? <span>{item.subtitle}</span> : null}
            {item.status ? <span>{item.status}</span> : null}
          </p>
        </div>
        <div className="admin-search__side">
          {item.amount != null ? <strong>{formatQuoteCurrency(item.amount)}</strong> : null}
          {item.updatedAt ? <span>{formatQuoteDateTime(item.updatedAt)}</span> : null}
        </div>
      </Link>
    </li>
  );
}

export default function AdminGlobalSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AdminSearchResponse>(EMPTY_RESPONSE);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResponse((prev) => ({ ...prev, query: trimmed, results: [], grouped: EMPTY_RESPONSE.grouped }));
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as AdminSearchResponse & { message?: string };
        if (!res.ok) throw new Error(json.message ?? "Không thể tìm kiếm");
        setResponse(json);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không thể tìm kiếm");
        setResponse(EMPTY_RESPONSE);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const resultCount = response.results.length;
  const hasQuery = query.trim().length >= 2;
  const groupedEntries = useMemo(
    () =>
      GROUP_ORDER.map((type) => ({
        type,
        label: ADMIN_SEARCH_ENTITY_LABELS[type],
        items: response.grouped[type] ?? [],
      })).filter((group) => group.items.length > 0),
    [response.grouped],
  );

  return (
    <AdminPageShell className="admin-search">
      <PageHeader
        title="Tìm kiếm toàn cục"
        description="Tìm nhanh Opportunity, CRM, báo giá, costing, đơn hàng, sản phẩm và Tech Pack."
        meta={<span>{hasQuery ? `${resultCount} kết quả` : "Nhập tối thiểu 2 ký tự để bắt đầu"}</span>}
      />

      <DataToolbar>
        <input
          className="admin-input admin-data-toolbar__search"
          placeholder="Nhập mã, tên, số điện thoại, email, SKU, quoteNo, orderNo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </DataToolbar>

      {error ? <p className="admin-error">{error}</p> : null}

      {loading ? (
        <AdminLoadingState label="Đang tìm kiếm dữ liệu..." rows={4} />
      ) : !hasQuery ? (
        <EmptyState
          title="Bắt đầu tìm kiếm"
          description="Nhập ít nhất 2 ký tự để tìm theo mã, tên, công ty, điện thoại hoặc email."
          compact
        />
      ) : resultCount === 0 ? (
        <EmptyState
          title="Không có kết quả phù hợp"
          description="Thử từ khóa ngắn hơn hoặc tìm theo mã bản ghi."
          compact
        />
      ) : (
        <div className="admin-search__groups">
          {groupedEntries.map((group) => (
            <section key={group.type} className="admin-panel admin-search__group">
              <h3 className="admin-search__group-title">
                {group.label} <span>({group.items.length})</span>
              </h3>
              <ul className="admin-search__list">
                {group.items.map((item) => (
                  <ResultRow key={`${item.type}:${item.id}`} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
