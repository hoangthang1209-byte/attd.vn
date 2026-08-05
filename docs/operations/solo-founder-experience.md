# Solo Founder Experience — Sprint 19.0

Sprint 19.0 is a **UX/IA-only** sprint: it re-shapes navigation, defaults and
copy for a single-founder/operator workflow. It does not add, remove or
change any AI Engine, Review, Publish, Knowledge, Media, Versioning,
Rollback, Quota or Ledger **logic**. Every route that existed before this
sprint stays live and reachable by direct URL, the command palette, or the
Team nav — nothing is deleted, gated behind a new permission, or migrated.

## Solo vs Team

Two client-only UI preferences, stored in `localStorage` (same primitives as
the blog editor's `editor-preferences.ts`, so a locked-down browser degrades
silently to the defaults):

| Preference | Key | Default | Purpose |
|---|---|---|---|
| Workspace Mode | `attd.editor.workspaceMode` | `solo` | `solo` \| `team` — controls nav density and the Content home screen |
| Developer Mode | `attd.editor.developerMode` | `false` | Shows/hides technical AI internals (provider, tokens, latency, cost, rollout stage) |

Source: `src/features/content/editorial/workspace-mode-preferences.ts`,
mounted app-wide via `WorkspaceModeProvider` /
`useWorkspaceMode()` in `src/components/admin/content/WorkspaceModeContext.tsx`
(mounted once in `AdminShell`). A compact **Solo/Team** and **Dev ON/OFF**
toggle lives in the admin shell header; the same toggles are also available
from the Cmd/Ctrl+K command palette.

### What Solo mode hides (UI only)

The main Content nav in Solo mode hides links to enterprise-operations
screens (`filterNavigationForWorkspaceMode` in `src/lib/admin/admin-navigation.ts`,
a **pure filter over the static registry** — the registry itself is never
mutated):

- Trung tâm vận hành (`/admin/content/operations`)
- AI vận hành (`/admin/content/ai`)
- Lịch biên tập (`/admin/content/calendar`)
- Hiệu quả nội dung (`/admin/content/performance`)
- Chiến lược (`/admin/content/seo-strategies`)
- Hướng dẫn biên tập (`/admin/content/launch`)

Solo shortlist that stays in the main nav: Dashboard (`/admin/content/seo`),
Chủ đề, Kiểm duyệt, Xuất bản, Blog.

**Every hidden route stays live**: direct URL navigation works exactly as
before, each is reachable from the Cmd/Ctrl+K command palette, and
Operations is one click away from the Content home footer ("Nâng cao →
Trung tâm vận hành"). Team mode shows the full, unfiltered Content nav.

## Content home (`/admin/content/seo`)

`SeoDashboardClient` renders one of two experiences from the same dashboard
API data it already loads — no new fetches:

- **Solo** → `SoloContentHome` (`src/components/admin/seo-content/SoloContentHome.tsx`):
  a calm grid of **at most 7 cards** — Tiếp tục viết, Bản nháp gần đây, Đã
  xuất bản gần đây, Tạo chủ đề mới, Làm mới bài viết, Thư viện Media, Thư
  viện Knowledge. Every card is a single `<Link>` — one click to its
  destination workspace, no BI charts, no workload panels, no dense KPI
  grid.
- **Team** → the existing dense Content Dashboard (Today / This Week /
  Upcoming / Quy trình / Việc của tôi / Sức khỏe nội dung / cluster
  coverage table) — unchanged.

## Topic workspace (`/admin/content/topics/[id]`)

Layout priority in Solo: Header → Writing canvas → AI Assistant (existing
`WritingEnginePanel`) → Images (Media module in the context rail) → Publish
Assistant. Noisy/technical panels are already collapsed by default
(`<details>`, closed): Brief & dàn ý, "Cài đặt tạo nội dung" (Writing Engine
setup), Chi tiết kế hoạch (`TopicProjectDetails`), Cài đặt nâng cao
(`TopicAdvancedDrawer`).

New: `TopicPublishAssistant.tsx` — a single calm "Sẵn sàng xuất bản" card
built from the checklist groups (`summarizeChecklistGroups`) and primary CTA
(`resolveTopicPrimaryCta`) the workspace already computes. It only renders a
**Preview** button (scrolls to the writing canvas) and the existing primary
CTA link/button (Start review / Open review / View published, depending on
status). It never calls `publishBlog`, `approveReview`, or any other
mutation directly — those stay exactly where they were.

## AI Assistant simplification (Developer Mode gate)

When Developer Mode is **off** (Solo default):

- `WritingEnginePanel` hides the provider/rollout-stage/token/cost line and
  the per-run tokens/latency/cost line, replacing them with a one-line
  "✨ AI Ready" / "⚠ AI unavailable" status derived from the same
  `aiConfigured` / run-status signals.
- `ProposalStatusBar` renders a single collapsed "✨ AI đã tạo đề xuất" pill
  instead of `provider · model · tokens`, and the expand toggle is a no-op —
  it can never reveal cost/latency/token detail outside Developer Mode.
- `ContentContextPanel`'s raw JSON export and the token/character "Budget"
  and "Sources" sections are hidden.
- All AI actions (generate / rewrite / QA / render / start review) remain
  fully available in both modes — Developer Mode only affects what
  *telemetry* is visible, never what is *possible*.
- `/admin/content/ai` (AI vận hành) shows a "Developer Mode recommended"
  banner when Developer Mode is off; the page itself is unchanged and still
  reachable (nav-hidden in Solo, but live by URL/palette).

Developer Mode **on** restores every technical field exactly as it rendered
before this sprint.

## Command palette (Cmd/Ctrl+K)

`src/components/admin/AdminCommandPalette.tsx`, mounted once in `AdminShell`,
wraps the existing `BlogCommandPalette` UI/keyboard-nav component. Distinct
shortcut (Cmd/Ctrl+K) from the blog editor's own Cmd+/ palette, so the two
never compete for the same key. Commands are navigation-only or local
preference toggles — no command calls a governed mutation directly:

Create Topic, Search Topics, Generate (AI Smoke Workspace), Improve (Chủ đề
đang viết), Refresh (bài thiếu hình), Search Knowledge, Search Media,
Publish Check (Xuất bản), Open Blog, Open DAM (Media), Open Operations
Center, Toggle Developer Mode, Toggle Solo/Team.

## Production-complete note

This sprint is UX/IA-only:

- No Prisma schema/migration changes (workspace mode and developer mode are
  `localStorage` preferences only).
- No new API routes, no changed request/response shape on any existing
  route.
- No workflow-state mutation was added, removed, or rewired — every button
  that used to call an endpoint still calls the same endpoint.
- All hidden nav items remain fully functional at their existing URL; the
  admin navigation contract tests (`admin-navigation.test.ts`) assert the
  **static registry** is unaffected, while
  `solo-founder-19-0.test.ts` covers the **mode-aware filter** separately.
