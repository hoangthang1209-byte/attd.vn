import type { AgentRunHistoryResponse } from "@/features/agent-os/agent-run.types";
import type { CtoLoopVisibility } from "@/features/agent-os/cto-loop.types";

export type AgentRunPanelLoadedState = {
  data: AgentRunHistoryResponse | null;
  ctoLoop: CtoLoopVisibility | null;
  g2Error: string | null;
  ctoLoopError: string | null;
};

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function fetchAgentRunHistory(
  issueNumber: number,
  fetchImpl: typeof fetch,
): Promise<AgentRunHistoryResponse> {
  const response = await fetchImpl(
    `/api/admin/automation/agent-runs?issueNumber=${issueNumber}&limit=10`,
  );
  const json = (await response.json()) as AgentRunHistoryResponse & { message?: string };
  if (!response.ok) throw new Error(json.message ?? "Không thể tải agent run");
  return json;
}

async function fetchCtoLoopVisibility(
  issueNumber: number,
  fetchImpl: typeof fetch,
): Promise<CtoLoopVisibility | null> {
  const response = await fetchImpl(`/api/admin/automation/cto-loop?issueNumber=${issueNumber}`);
  const json = (await response.json()) as {
    visibility: CtoLoopVisibility | null;
    message?: string;
  };
  if (!response.ok) throw new Error(json.message ?? "Không thể tải CTO loop");
  return json.visibility;
}

/** Loads G2 and G3 panel data independently so a G3 failure does not hide G2 history. */
export async function loadAgentRunPanelData(
  issueNumber: number,
  fetchImpl: typeof fetch = fetch,
): Promise<AgentRunPanelLoadedState> {
  const [runsResult, ctoLoopResult] = await Promise.allSettled([
    fetchAgentRunHistory(issueNumber, fetchImpl),
    fetchCtoLoopVisibility(issueNumber, fetchImpl),
  ]);

  let data: AgentRunHistoryResponse | null = null;
  let g2Error: string | null = null;
  if (runsResult.status === "fulfilled") {
    data = runsResult.value;
  } else {
    g2Error = errorMessage(runsResult.reason, "Lỗi tải agent run");
  }

  let ctoLoop: CtoLoopVisibility | null = null;
  let ctoLoopError: string | null = null;
  if (ctoLoopResult.status === "fulfilled") {
    ctoLoop = ctoLoopResult.value;
  } else {
    ctoLoopError = errorMessage(ctoLoopResult.reason, "Không thể tải CTO loop (G3)");
  }

  return { data, ctoLoop, g2Error, ctoLoopError };
}
