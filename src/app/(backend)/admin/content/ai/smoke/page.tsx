import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ContentAiSmokeClient from "@/components/admin/content/ContentAiSmokeClient";

/** Sprint 18.1 — AI Smoke Workspace: read-only prerequisite checks + TEST-only Failure Lab simulations. */
export default function ContentAiSmokePage() {
  return (
    <>
      <AdminPageTitle title="AI Smoke Workspace" />
      <ContentAiSmokeClient />
    </>
  );
}
