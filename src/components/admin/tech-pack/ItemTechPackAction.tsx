"use client";

import { useState } from "react";
import Link from "next/link";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  orderItemId?: string;
  quoteItemId?: string;
  latestTechPackId?: string | null;
  latestTechPackVersion?: number | null;
  onCreated?: (techPackId: string) => void;
};

export default function ItemTechPackAction({
  orderItemId,
  quoteItemId,
  latestTechPackId,
  latestTechPackVersion,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTechPack() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tech-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: orderItemId ?? null,
          quoteItemId: quoteItemId ?? null,
        }),
      });
      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo Tech Pack");
      if (data.id) {
        onCreated?.(data.id);
        window.location.href = `/admin/tech-pack/${data.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo Tech Pack");
    } finally {
      setLoading(false);
    }
  }

  if (latestTechPackId) {
    return (
      <div className="item-tech-pack-action">
        <Link
          href={`/admin/tech-pack/${latestTechPackId}`}
          className="admin-btn admin-btn--secondary admin-btn--small"
        >
          Xem Tech Pack
          {latestTechPackVersion != null ? ` (v${latestTechPackVersion})` : ""}
        </Link>
      </div>
    );
  }

  return (
    <div className="item-tech-pack-action">
      <AdminLoadingButton
        variant="primary"
        size="small"
        pending={loading}
        pendingLabel="Đang tạo Tech Pack…"
        onClick={() => void createTechPack()}
      >
        Tạo Tech Pack
      </AdminLoadingButton>
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
