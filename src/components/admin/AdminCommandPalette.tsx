"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BlogCommandPalette, { type PaletteCommand } from "@/components/admin/blog-editor/BlogCommandPalette";
import { useWorkspaceMode } from "@/components/admin/content/WorkspaceModeContext";

/**
 * Sprint 19.0 — shell-wide Cmd/Ctrl+K palette. Every entry is either a plain
 * navigation (existing routes only — no new pages) or a local UI preference
 * toggle (Solo/Team, Developer Mode). It never calls a governed mutation
 * (publish, approve, generate) itself — those stay inside their own pages.
 * Distinct shortcut from the blog editor's own Cmd+/ palette so the two
 * never fight for the same key.
 */
export default function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { mode, developerMode, toggleMode, toggleDeveloperMode } = useWorkspaceMode();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "create-topic",
        label: "Tạo chủ đề mới",
        section: "Nội dung",
        hint: "Chủ đề",
        run: () => router.push("/admin/content/seo-topics"),
      },
      {
        id: "search-topics",
        label: "Tìm chủ đề",
        section: "Nội dung",
        run: () => router.push("/admin/content/seo-topics"),
      },
      {
        id: "generate",
        label: "Generate — AI Smoke Workspace",
        section: "AI",
        run: () => router.push("/admin/content/ai/smoke"),
      },
      {
        id: "improve",
        label: "Cải thiện bài viết",
        section: "AI",
        hint: "Chủ đề đang viết",
        run: () => router.push("/admin/content/seo-topics?view=drafting"),
      },
      {
        id: "refresh",
        label: "Làm mới bài viết cũ",
        section: "Nội dung",
        hint: "Thiếu hình / cần cập nhật",
        run: () => router.push("/admin/content/seo-topics?view=missing-media"),
      },
      {
        id: "search-knowledge",
        label: "Tìm Knowledge",
        section: "Knowledge",
        run: () => router.push("/admin/knowledge-base"),
      },
      {
        id: "search-media",
        label: "Tìm Media",
        section: "Media",
        run: () => router.push("/admin/media"),
      },
      {
        id: "publish-check",
        label: "Kiểm tra xuất bản",
        section: "Xuất bản",
        run: () => router.push("/admin/content/publishing"),
      },
      {
        id: "open-blog",
        label: "Mở Blog",
        section: "Nội dung",
        run: () => router.push("/admin/blog"),
      },
      {
        id: "open-dam",
        label: "Mở Thư viện tài sản (DAM)",
        section: "Media",
        run: () => router.push("/admin/media"),
      },
      {
        id: "open-operations",
        label: "Mở Trung tâm vận hành",
        section: "Nâng cao",
        hint: "Operations Center",
        run: () => router.push("/admin/content/operations"),
      },
      {
        id: "toggle-developer-mode",
        label: developerMode ? "Tắt Developer Mode" : "Bật Developer Mode",
        section: "Cài đặt",
        run: () => toggleDeveloperMode(),
      },
      {
        id: "toggle-workspace-mode",
        label: mode === "solo" ? "Chuyển sang Team mode" : "Chuyển sang Solo mode",
        section: "Cài đặt",
        run: () => toggleMode(),
      },
    ],
    [router, mode, developerMode, toggleDeveloperMode, toggleMode],
  );

  return <BlogCommandPalette open={open} commands={commands} onClose={() => setOpen(false)} />;
}
