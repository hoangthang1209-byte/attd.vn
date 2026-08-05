import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { adminNavigationSections, filterNavigationForWorkspaceMode } from "@/lib/admin/admin-navigation";
import {
  DEFAULT_DEVELOPER_MODE,
  DEFAULT_WORKSPACE_MODE,
  isDeveloperMode,
  isSoloMode,
  readDeveloperMode,
  readWorkspaceMode,
  writeDeveloperMode,
  writeWorkspaceMode,
} from "@/features/content/editorial/workspace-mode-preferences";

function read(path: string) {
  return readFileSync(path, "utf8");
}

/** Minimal Storage-shaped fake — only the two methods editor-preferences.ts touches. */
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("Sprint 19.0 Solo Founder Experience", () => {
  it("workspace mode defaults to solo when no preference is stored", () => {
    assert.equal(DEFAULT_WORKSPACE_MODE, "solo");
    assert.equal(readWorkspaceMode(), "solo");
    assert.equal(isSoloMode(), true);
  });

  it("developer mode defaults to false when no preference is stored", () => {
    assert.equal(DEFAULT_DEVELOPER_MODE, false);
    assert.equal(readDeveloperMode(), false);
    assert.equal(isDeveloperMode(), false);
  });

  it("round-trips workspace mode and developer mode through a mocked localStorage", () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = { localStorage: createFakeLocalStorage() };
    try {
      assert.equal(readWorkspaceMode(), "solo");
      writeWorkspaceMode("team");
      assert.equal(readWorkspaceMode(), "team");
      writeWorkspaceMode("solo");
      assert.equal(readWorkspaceMode(), "solo");

      assert.equal(readDeveloperMode(), false);
      writeDeveloperMode(true);
      assert.equal(readDeveloperMode(), true);
      writeDeveloperMode(false);
      assert.equal(readDeveloperMode(), false);
    } finally {
      if (originalWindow === undefined) delete (globalThis as Record<string, unknown>).window;
      else (globalThis as Record<string, unknown>).window = originalWindow;
    }
  });

  it("Solo nav filter hides the Content operations href", () => {
    const filtered = filterNavigationForWorkspaceMode(adminNavigationSections, true);
    const content = filtered.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    const hrefs = content.platforms.flatMap((p) => p.items.map((i) => i.href));
    assert.ok(!hrefs.includes("/admin/content/operations"));
    assert.ok(!hrefs.includes("/admin/content/ai"));
    assert.ok(!hrefs.includes("/admin/content/calendar"));
    assert.ok(!hrefs.includes("/admin/content/performance"));
    // Solo shortlist stays reachable.
    assert.ok(hrefs.includes("/admin/content/seo"));
    assert.ok(hrefs.includes("/admin/content/seo-topics"));
    assert.ok(hrefs.includes("/admin/content/reviews"));
    assert.ok(hrefs.includes("/admin/content/publishing"));
    assert.ok(hrefs.includes("/admin/blog"));
  });

  it("Team nav keeps the Content operations href", () => {
    const filtered = filterNavigationForWorkspaceMode(adminNavigationSections, false);
    const content = filtered.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    const hrefs = content.platforms.flatMap((p) => p.items.map((i) => i.href));
    assert.ok(hrefs.includes("/admin/content/operations"));
    assert.ok(hrefs.includes("/admin/content/ai"));
    // Filter never mutates the static registry — Team output equals unfiltered items.
    const rawContent = adminNavigationSections.find((s) => s.label === "NỘI DUNG");
    assert.ok(rawContent);
    assert.deepEqual(
      content.platforms.flatMap((p) => p.items.map((i) => i.href)),
      rawContent.platforms.flatMap((p) => p.items.map((i) => i.href)),
    );
  });

  it("Content home shows at most 7 calm cards, each one click from topic/media/knowledge/publishing", () => {
    const source = read("src/components/admin/seo-content/SoloContentHome.tsx");
    const cardMatches = source.match(/\{ key: "/g) ?? [];
    assert.ok(cardMatches.length > 0);
    assert.ok(cardMatches.length <= 7, `expected <= 7 solo home cards, found ${cardMatches.length}`);
    assert.match(source, /\/admin\/content\/topics\//);
    assert.match(source, /\/admin\/media/);
    assert.match(source, /\/admin\/knowledge-base/);
    assert.match(source, /\/admin\/content\/publishing/);
    assert.match(source, /\/admin\/content\/seo-topics/);
    assert.doesNotMatch(source, /admin-catalog-kpi|<table|ProgressBar/);
  });

  it("Publish Assistant exists and only links/scrolls — never calls publish or review-approval APIs", () => {
    const source = read("src/components/admin/seo-content/topic-workspace/TopicPublishAssistant.tsx");
    assert.match(source, /export default function TopicPublishAssistant/);
    assert.doesNotMatch(source, /publishBlog/);
    assert.doesNotMatch(source, /approveReview/);
    assert.doesNotMatch(source, /approve-review/);
    assert.doesNotMatch(source, /fetch\(/);
    // Wired into the topic workspace canvas near the writing engine.
    const client = read("src/components/admin/seo-content/SeoTopicDetailClient.tsx");
    assert.match(client, /TopicPublishAssistant/);
  });

  it("Command palette is mounted in the shell with a Cmd/Ctrl+K shortcut", () => {
    const shell = read("src/components/admin/AdminShell.tsx");
    assert.match(shell, /AdminCommandPalette/);
    const palette = read("src/components/admin/AdminCommandPalette.tsx");
    assert.match(palette, /BlogCommandPalette/);
    assert.match(palette, /key\.toLowerCase\(\)\s*===\s*"k"/);
    assert.match(palette, /metaKey \|\| event\.ctrlKey/);
    assert.match(palette, /Toggle Developer Mode|toggle-developer-mode/i);
  });

  it("Developer Mode gates ProposalStatusBar's technical fields", () => {
    const source = read("src/components/admin/content/ai-writing/ProposalStatusBar.tsx");
    assert.match(source, /useWorkspaceMode/);
    assert.match(source, /!developerMode/);
    assert.match(source, /AI đã tạo đề xuất/);
  });

  it("Developer Mode gates WritingEnginePanel's provider/token/cost internals", () => {
    const source = read("src/components/admin/content/WritingEnginePanel.tsx");
    assert.match(source, /useWorkspaceMode/);
    assert.match(source, /developerMode && contentGenStatus\?\.rolloutStage/);
    assert.match(source, /AI Ready/);
  });

  it("adds no Prisma migration for Solo Founder workspace preferences", () => {
    const files = readdirSync("prisma/migrations");
    const relevant = files.filter((f) => /solo.?founder|workspace.?mode|developer.?mode/i.test(f));
    assert.deepEqual(relevant, []);
    const schema = read("prisma/schema.prisma");
    assert.doesNotMatch(schema, /model\s+WorkspaceMode/);
    assert.doesNotMatch(schema, /model\s+DeveloperMode/);
  });

  it("keeps AI governance untouched — Solo Founder UI never auto-enables content generation", () => {
    const files = [
      "src/features/content/editorial/workspace-mode-preferences.ts",
      "src/components/admin/content/WorkspaceModeContext.tsx",
      "src/components/admin/AdminCommandPalette.tsx",
      "src/components/admin/seo-content/SoloContentHome.tsx",
    ].map(read);
    for (const source of files) {
      assert.doesNotMatch(source, /rolloutStage\s*[:=]\s*["']OPENAI/i);
      assert.doesNotMatch(source, /["']CONTENT_GENERATION["']\s*[:,]\s*.*enabled\s*:\s*true/i);
      assert.doesNotMatch(source, /\/api\/content\/generation/);
      assert.doesNotMatch(source, /publishBlog|approveReview/);
    }
  });

  it("three-click audit: every Solo home card is one click from its destination workspace", () => {
    const source = read("src/components/admin/seo-content/SoloContentHome.tsx");
    // Every card renders through a single <Link href=...> — no intermediate picker/modal step.
    const linkCount = (source.match(/<Link\s/g) ?? []).length;
    const cardCount = (source.match(/\{ key: "/g) ?? []).length;
    assert.ok(linkCount >= 1);
    assert.ok(cardCount <= 7);
    assert.match(source, /href=\{href\}/);
  });
});
