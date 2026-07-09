"use client";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

type AdminInlineLoaderProps = {
  message?: string;
};

export default function AdminInlineLoader({
  message = "Đang cập nhật báo cáo…",
}: AdminInlineLoaderProps) {
  return (
    <InlineLoading title={message} tone="admin" />
  );
}
