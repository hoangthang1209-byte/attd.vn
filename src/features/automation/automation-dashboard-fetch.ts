import type { AutomationDashboardView } from "@/features/automation/automation-dashboard.views";

export type DashboardFetchKind = "foreground" | "background";

export type DashboardFetchTicket = {
  requestId: number;
  targetView: AutomationDashboardView;
  kind: DashboardFetchKind;
};

export type DashboardFetchBeginOptions = {
  /** Replace an in-flight active background fetch (seed/manual lane refresh). */
  preemptActiveBackground?: boolean;
};

export type DashboardFetchSequencer = {
  beginRequest: (
    targetView: AutomationDashboardView,
    kind: DashboardFetchKind,
    options?: DashboardFetchBeginOptions,
  ) => DashboardFetchTicket | null;
  shouldApplyResponse: (
    ticket: DashboardFetchTicket,
    currentView: AutomationDashboardView,
  ) => boolean;
  shouldApplyActiveLaneResponse: (ticket: DashboardFetchTicket) => boolean;
  endRequest: (ticket: DashboardFetchTicket) => void;
  isLatestForegroundRequest: (ticket: DashboardFetchTicket) => boolean;
};

/** Coordinates foreground/background dashboard fetches with stale-response protection. */
export function createDashboardFetchSequencer(): DashboardFetchSequencer {
  let nextRequestId = 0;
  let latestForegroundRequestId = 0;
  let latestActiveTargetRequestId = 0;
  let backgroundInFlight = false;
  let activeBackgroundInFlight = false;

  return {
    beginRequest(targetView, kind, options = {}) {
      const requestId = ++nextRequestId;
      if (targetView === "active") {
        latestActiveTargetRequestId = requestId;
      }

      if (kind === "background") {
        if (targetView === "active") {
          if (activeBackgroundInFlight && !options.preemptActiveBackground) return null;
          activeBackgroundInFlight = true;
          return { requestId, targetView, kind };
        }

        if (backgroundInFlight) return null;
        backgroundInFlight = true;
        return { requestId, targetView, kind };
      }

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
        return currentView === "active";
      }

      return currentView === ticket.targetView;
    },

    shouldApplyActiveLaneResponse(ticket) {
      return ticket.targetView === "active" && ticket.requestId === latestActiveTargetRequestId;
    },

    isLatestForegroundRequest(ticket) {
      return ticket.kind === "foreground" && ticket.requestId === latestForegroundRequestId;
    },

    endRequest(ticket) {
      if (ticket.kind === "background") {
        if (ticket.targetView === "active") {
          activeBackgroundInFlight = false;
        } else {
          backgroundInFlight = false;
        }
      }
    },
  };
}
