import type { AutomationDashboardView } from "@/features/automation/automation-dashboard.views";

export type DashboardFetchKind = "foreground" | "background";

export type DashboardFetchTicket = {
  requestId: number;
  targetView: AutomationDashboardView;
  kind: DashboardFetchKind;
};

export type DashboardFetchSequencer = {
  beginRequest: (targetView: AutomationDashboardView, kind: DashboardFetchKind) => DashboardFetchTicket | null;
  shouldApplyResponse: (
    ticket: DashboardFetchTicket,
    currentView: AutomationDashboardView,
  ) => boolean;
  endRequest: (ticket: DashboardFetchTicket) => void;
};

/** Coordinates foreground/background dashboard fetches with stale-response protection. */
export function createDashboardFetchSequencer(): DashboardFetchSequencer {
  let nextRequestId = 0;
  let latestForegroundRequestId = 0;
  let backgroundInFlight = false;

  return {
    beginRequest(targetView, kind) {
      if (kind === "background") {
        if (backgroundInFlight) return null;
        backgroundInFlight = true;
        return { requestId: ++nextRequestId, targetView, kind };
      }

      const requestId = ++nextRequestId;
      latestForegroundRequestId = requestId;
      return { requestId, targetView, kind: "foreground" };
    },

    shouldApplyResponse(ticket, currentView) {
      if (ticket.kind === "foreground") {
        return ticket.requestId === latestForegroundRequestId;
      }

      if (ticket.targetView === "active") {
        return true;
      }

      if (ticket.requestId < latestForegroundRequestId) {
        return false;
      }

      return currentView === ticket.targetView;
    },

    endRequest(ticket) {
      if (ticket.kind === "background") {
        backgroundInFlight = false;
      }
    },
  };
}
