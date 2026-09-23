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
  isLatestForegroundRequest: (ticket: DashboardFetchTicket) => boolean;
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

      if (ticket.requestId < latestForegroundRequestId) {
        return false;
      }

      if (ticket.targetView === "active") {
        return true;
      }

      return currentView === ticket.targetView;
    },

    isLatestForegroundRequest(ticket) {
      return ticket.kind === "foreground" && ticket.requestId === latestForegroundRequestId;
    },

    endRequest(ticket) {
      if (ticket.kind === "background") {
        backgroundInFlight = false;
      }
    },
  };
}
